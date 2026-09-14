import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DOS_SYSTEM_PROMPT } from "@/lib/dos-prompt";
import { CRISIS_FALLBACK, isCrisis } from "@/lib/crisis";
import {
  DOS_HISTORY_LIMIT,
  DOS_MAX_INPUT,
  DOS_MAX_TOKENS,
  DOS_MODEL,
} from "@/lib/dos-config";

// Ключ Claude живёт только здесь, на сервере. В браузер он не попадает никогда.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Slot = {
  allowed: boolean;
  plus_active: boolean;
  used_total: number;
  left_total: number;
  free_total: number;
};

// Тексты сообщений на сервере не логируем — правило из CLAUDE.md.
function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return fail("Сайт не подключён к базе: не заполнен .env.local.", 500);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Нужно войти.", 401);

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return fail("Не разобрал запрос.", 400);
  }
  if (!text) return fail("Пустое сообщение.", 400);
  if (text.length > DOS_MAX_INPUT) return fail("Сообщение слишком длинное.", 400);

  // Кризисные слова проверяем ДО обращения к модели.
  const crisis = isCrisis(text);

  // Талон на сообщение: проверка Plus и остатка пакета — на сервере, в базе.
  const { data: slotRows, error: slotError } = await supabase.rpc("dos_take_slot");
  if (slotError) {
    return fail(
      slotError.code === "PGRST202" || slotError.code === "42883"
        ? "В базе нет функций Доса. Выполни supabase/stage3.sql в Supabase → SQL Editor."
        : "Не получилось проверить лимит. Попробуй ещё раз.",
      500,
    );
  }
  const slot = (Array.isArray(slotRows) ? slotRows[0] : slotRows) as Slot;

  if (!slot?.allowed) {
    // Бесплатные сообщения кончились. Но если человеку плохо —
    // помощь показываем всё равно, без всякой оплаты.
    return NextResponse.json({
      limitReached: true,
      crisis,
      text: crisis ? CRISIS_FALLBACK : null,
      left: 0,
      plus: false,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      "Не подключён ключ Claude. Добавь ANTHROPIC_API_KEY в .env.local и в настройки Vercel.",
      500,
    );
  }

  // Последние сообщения — чтобы Дос помнил разговор, но счёт не рос лавиной.
  const { data: historyRows } = await supabase
    .from("dos_messages")
    .select("role, text")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(DOS_HISTORY_LIMIT);

  const history = ((historyRows ?? []) as { role: "user" | "assistant"; text: string }[])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.text }));

  await supabase
    .from("dos_messages")
    .insert({ user_id: user.id, role: "user", text });

  let answer = "";
  try {
    const claude = new Anthropic();
    const response = await claude.messages.create({
      model: DOS_MODEL,
      max_tokens: DOS_MAX_TOKENS,
      // Промпт Доса не меняется от запроса к запросу — помечаем его как
      // кэшируемый, повторные обращения к нему стоят в 10 раз дешевле.
      system: [
        {
          type: "text",
          text: DOS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [...history, { role: "user" as const, content: text }],
    });

    for (const block of response.content) {
      if (block.type === "text") answer += block.text;
    }
    answer = answer.trim();
  } catch (error) {
    const known =
      error instanceof Anthropic.AuthenticationError
        ? "Ключ Claude не подошёл. Проверь ANTHROPIC_API_KEY."
        : error instanceof Anthropic.RateLimitError
          ? "Дос сейчас перегружен. Попробуй через минуту."
          : "Дос не ответил. Попробуй ещё раз.";
    return NextResponse.json(
      { error: known, crisis, text: crisis ? CRISIS_FALLBACK : null },
      { status: 502 },
    );
  }

  if (!answer) answer = "Я здесь. Расскажи ещё?";

  await supabase
    .from("dos_messages")
    .insert({ user_id: user.id, role: "assistant", text: answer });

  return NextResponse.json({
    text: answer,
    crisis,
    left: slot.plus_active ? null : slot.left_total,
    plus: slot.plus_active,
  });
}
