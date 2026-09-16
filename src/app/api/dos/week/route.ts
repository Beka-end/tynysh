import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CRISIS_TURN_INSTRUCTION, DOS_SYSTEM_PROMPT } from "@/lib/dos-prompt";
import { isCrisis } from "@/lib/crisis";
import { DOS_MODEL } from "@/lib/dos-config";
import { MOODS } from "@/lib/mood";

// Ключ Claude только на сервере.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEK_TASK = `Тебе показали дневник настроения за последние дни: оценка от 1 (совсем плохо) до 5 (отлично) и короткая заметка, что было в этот день.

Напиши короткий итог недели — 3–5 предложений, как обычно, живым языком:
- скажи, что видно со стороны: где было тяжелее всего, где легче, повторяется ли что-то;
- свяжи настроение с тем, что человек записал, если связь заметна;
- закончи одной мыслью или маленьким шагом на следующую неделю, без вопросов.

Не ставь диагнозов, не называй расстройств, не хвали за «хорошие» оценки и не ругай за «плохие». Если неделя была тяжёлой почти целиком — мягко скажи, что с этим не надо справляться в одиночку, и предложи поговорить с близким взрослым или со специалистом.`;

export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Сайт не подключён к базе." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });

  const { data: statusRows } = await supabase.rpc("dos_status");
  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as
    | { plus_active: boolean }
    | null;
  if (!status?.plus_active) {
    return NextResponse.json(
      { error: "Итог недели входит в Дос Plus." },
      { status: 403 },
    );
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: moods } = await supabase
    .from("moods")
    .select("day, value, note")
    .gte("day", since)
    .order("day", { ascending: true });

  const rows = (moods ?? []) as { day: string; value: number; note: string | null }[];
  if (rows.length < 3) {
    return NextResponse.json(
      { error: "Отметь хотя бы три дня — тогда будет из чего собирать итог." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Не подключён ключ Claude." }, { status: 500 });
  }

  const diary = rows
    .map((row) => {
      const mood = MOODS.find((m) => m.value === row.value);
      return `${row.day}: ${row.value}/5 (${mood?.label ?? "—"})${
        row.note ? ` — ${row.note}` : ""
      }`;
    })
    .join("\n");

  // Заметки тоже проверяем на кризисные слова — итог недели не должен
  // пройти мимо того, о чём человек написал в дневнике.
  const crisis = rows.some((row) => (row.note ? isCrisis(row.note) : false));

  try {
    const claude = new Anthropic();
    const response = await claude.messages.create({
      model: DOS_MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: DOS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: WEEK_TASK },
        ...(crisis ? [{ type: "text" as const, text: CRISIS_TURN_INSTRUCTION }] : []),
      ],
      messages: [{ role: "user", content: diary }],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }

    return NextResponse.json({ text: text.trim(), crisis });
  } catch {
    return NextResponse.json(
      { error: "Дос не смог собрать итог. Попробуй ещё раз." },
      { status: 502 },
    );
  }
}
