"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dbErrorToRussian } from "@/lib/errors";
import { MOODS, lastDays, moodOf, shortDay, todayKey, type MoodRow } from "@/lib/mood";

export function MoodDiary({
  userId,
  rows,
  plus,
}: {
  userId: string;
  rows: MoodRow[];
  plus: boolean;
}) {
  const router = useRouter();
  const today = todayKey();
  const byDay = useMemo(() => {
    const map: Record<string, MoodRow> = {};
    rows.forEach((row) => (map[row.day] = row));
    return map;
  }, [rows]);

  const mine = byDay[today];
  const [value, setValue] = useState<number | null>(mine?.value ?? null);
  const [note, setNote] = useState(mine?.note ?? "");
  const [saved, setSaved] = useState(Boolean(mine));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);

  async function save(next: number) {
    setValue(next);
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("moods")
      .upsert(
        { user_id: userId, day: today, value: next, note: note.trim() || null },
        { onConflict: "user_id,day" },
      );

    setBusy(false);
    if (saveError) {
      setError(dbErrorToRussian(saveError.code, saveError.message));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function saveNote() {
    if (!value) return;
    await save(value);
  }

  async function askSummary() {
    setSummaryBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dos/week", { method: "POST" });
      const data = (await response.json()) as { text?: string; error?: string };
      if (data.error) setError(data.error);
      else setSummary(data.text ?? "");
    } catch {
      setError("Нет связи с сервером.");
    }
    setSummaryBusy(false);
  }

  const days = lastDays(14);
  const filled = days.filter((d) => byDay[d]).length;

  return (
    <div>
      {/* сегодня */}
      <div className="rounded-2xl bg-tynysh-bg p-3">
        <div className="mb-2 text-sm font-bold">
          {saved ? "Сегодня ты отметил(а)" : "Как ты сегодня?"}
        </div>
        <div className="flex justify-between gap-1">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              disabled={busy}
              onClick={() => save(mood.value)}
              title={mood.label}
              className={`flex-1 rounded-xl py-2 text-2xl transition ${
                value === mood.value ? "bg-white shadow-sm" : "opacity-50 hover:opacity-100"
              }`}
            >
              {mood.emoji}
            </button>
          ))}
        </div>

        {value && (
          <div className="mt-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              onBlur={saveNote}
              rows={2}
              placeholder="Что было сегодня? Одна строчка — этого достаточно"
              className="w-full rounded-xl border border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
          {error}
        </div>
      )}

      {/* две недели */}
      <div className="mt-5 mb-1 text-sm font-bold">Последние две недели</div>
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {days.map((day) => {
          const row = byDay[day];
          const mood = moodOf(row?.value);
          return (
            <div key={day} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-tynysh-soft"
                style={{ height: `${row ? row.value * 12 : 4}px` }}
                title={row?.note ?? mood?.label ?? ""}
              />
              <div className="text-base leading-none">{mood?.emoji ?? "·"}</div>
              <div className="text-[9px] leading-none opacity-40">
                {shortDay(day).replace(" ", " ")}
              </div>
            </div>
          );
        })}
      </div>

      {/* итог недели */}
      <div className="mt-6 rounded-2xl bg-dos p-4 text-sm text-dos-text">
        <div className="mb-1 font-bold">Итог недели от Доса</div>
        {plus ? (
          <>
            <p className="leading-relaxed opacity-90">
              {summary ||
                (filled < 3
                  ? "Отметь хотя бы три дня — тогда будет из чего собирать итог."
                  : "Дос посмотрит на твою неделю и скажет, что видит со стороны.")}
            </p>
            {filled >= 3 && (
              <button
                type="button"
                onClick={askSummary}
                disabled={summaryBusy}
                className="mt-2 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-dos-text disabled:opacity-50"
              >
                {summaryBusy ? "Дос думает…" : summary ? "Пересобрать" : "Показать итог"}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="leading-relaxed opacity-90">
              Дос посмотрит на твою неделю целиком и скажет, что видит со стороны:
              когда было тяжелее всего и что этому предшествовало. Это входит в Plus.
            </p>
            <Link
              href="/plus"
              className="mt-2 inline-block rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-dos-text"
            >
              Что такое Plus
            </Link>
          </>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#8A85A3]">
        Дневник видишь только ты — ни родители, ни админы в него не заглядывают.
        Если тебе плохо прямо сейчас — звони <b>150</b>.
      </p>
    </div>
  );
}
