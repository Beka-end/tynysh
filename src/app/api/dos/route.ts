import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  CRISIS_TURN_INSTRUCTION,
  DOS_SYSTEM_PROMPT,
  NO_QUESTION_TURN,
  buildContext,
} from "@/lib/dos-prompt";
import { CRISIS_FALLBACK, isCrisis } from "@/lib/crisis";
import {
  DOS_HISTORY_LIMIT,
  DOS_HISTORY_LIMIT_PLUS,
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
  /** ok · pack_over (кончился бесплатный пакет) · plus_daily (потолок у Plus) */
  reason: string;
};

type HistoryRow = { role: "user" | "assistant"; text: string; created_at: string };

// Тексты сообщений на сервере не логируем — правило из CLAUDE.md.
function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Который сейчас час у собеседника (Казахстан). */
function almatyHour(): number {
  const raw = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number(raw) % 24;
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
    // Два разных отказа. Подписчику, упёршемуся в дневной потолок, нельзя
    // показывать «купи Plus» — он уже купил. И в обоих случаях, если человеку
    // плохо, помощь показываем всё равно, без всякой оплаты.
    const daily = slot?.reason === "plus_daily";
    return NextResponse.json({
      limitReached: !daily,
      dailyLimit: daily,
      crisis,
      text: crisis ? CRISIS_FALLBACK : null,
      left: daily ? null : 0,
      plus: Boolean(slot?.plus_active),
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      "Не подключён ключ Claude. Добавь ANTHROPIC_API_KEY в .env.local и в настройки Vercel.",
      500,
    );
  }

  // Профиль (нужно имя) и последние сообщения — одновременно.
  const [{ data: profile }, { data: historyRows }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .from("dos_messages")
      .select("role, text, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(slot.plus_active ? DOS_HISTORY_LIMIT_PLUS : DOS_HISTORY_LIMIT),
  ]);

  const rows = (historyRows ?? []) as HistoryRow[];
  const history: Anthropic.MessageParam[] = rows
    .slice()
    .reverse()
    .map((m, index, all) =>
      index === all.length - 1
        ? {
            // Отметка на последнем сообщении истории: всё, что до неё
            // (промпт + разговор), при следующем ответе берётся из кэша
            // и стоит в десять раз дешевле.
            role: m.role,
            content: [
              {
                type: "text" as const,
                text: m.text,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          }
        : { role: m.role, content: m.text },
    );

  // Если прошлый ответ Доса заканчивался вопросом — в этом вопросов быть не должно.
  // Иначе разговор скатывается в допрос: человек отвечает, а помощи всё нет.
  const previous = rows[0];
  const askedLastTime =
    previous?.role === "assistant" && /[?？]\s*$/.test(previous.text.trim());

  const lastAt = rows[0]?.created_at ? Date.parse(rows[0].created_at) : null;
  const context = buildContext({
    name: (profile as { name?: string } | null)?.name ?? "друг",
    hour: almatyHour(),
    hoursSinceLast: lastAt ? (Date.now() - lastAt) / 3_600_000 : null,
    isFirstTalk: rows.length === 0,
  });

  await supabase.from("dos_messages").insert({ user_id: user.id, role: "user", text });

  const claude = new Anthropic();
  const stream = claude.messages.stream({
    model: DOS_MODEL,
    max_tokens: DOS_MAX_TOKENS,
    system: [
      {
        // Сам промпт не меняется от запроса к запросу — помечаем его как
        // кэшируемый, повторные обращения к нему стоят в 10 раз дешевле.
        type: "text",
        text: DOS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      // А это меняется каждый раз, поэтому идёт после кэшируемой части.
      { type: "text", text: context },
      ...(askedLastTime ? [{ type: "text" as const, text: NO_QUESTION_TURN }] : []),
      ...(crisis ? [{ type: "text" as const, text: CRISIS_TURN_INSTRUCTION }] : []),
    ],
    messages: [...history, { role: "user" as const, content: text }],
  });

  // Ответ отдаём по мере написания: человек видит первые слова через секунду,
  // а не смотрит на «Дос печатает…» десять секунд.
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        if (!answer) {
          controller.enqueue(
            encoder.encode(
              crisis
                ? CRISIS_FALLBACK
                : "Дос не смог ответить — попробуй написать ещё раз.",
            ),
          );
        }
      }

      if (answer.trim()) {
        await supabase.from("dos_messages").insert({
          user_id: user.id,
          role: "assistant",
          text: answer.trim(),
        });
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Dos-Crisis": crisis ? "1" : "0",
      "X-Dos-Plus": slot.plus_active ? "1" : "0",
      "X-Dos-Left": slot.plus_active ? "" : String(slot.left_total),
    },
  });
}
