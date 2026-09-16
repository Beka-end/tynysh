/** Дневник настроения: пять состояний на выбор, одно на день. */
export const MOODS = [
  { value: 1, emoji: "😣", label: "Совсем плохо" },
  { value: 2, emoji: "🙁", label: "Так себе" },
  { value: 3, emoji: "😐", label: "Нормально" },
  { value: 4, emoji: "🙂", label: "Хорошо" },
  { value: 5, emoji: "😄", label: "Отлично" },
] as const;

export type MoodRow = { day: string; value: number; note: string | null };

export function moodOf(value: number | null | undefined) {
  return MOODS.find((m) => m.value === value) ?? null;
}

/** Сегодняшняя дата по Казахстану в виде 2026-09-16 — так же, как её видит база. */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Последние N дней, от старых к новым. */
export function lastDays(count: number): string[] {
  const days: string[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    days.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Almaty",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date),
    );
  }
  return days;
}

/** «16 сент» — подпись под столбиком. */
export function shortDay(key: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "numeric",
    month: "short",
  }).format(new Date(`${key}T12:00:00Z`));
}
