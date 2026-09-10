/** Профиль пользователя — таблица profiles в supabase/schema.sql */
export type Profile = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  birth_year: number;
  is_plus: boolean | null;
  plus_until: string | null;
  is_admin: boolean | null;
  last_seen: string | null;
  created_at: string | null;
};

/** Минимальный возраст: младше 13 лет в Tynysh нельзя. */
export const MIN_AGE = 13;

/** Такое же правило, как в базе: 3–32 символа, латиница, цифры, _ и . */
export const HANDLE_RE = /^[a-z0-9_.]{3,32}$/;

export function cleanHandle(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase().slice(0, 32);
}

export function ageFromBirthYear(year: number): number {
  return new Date().getFullYear() - year;
}

/** Проверяем год рождения. Возвращаем текст ошибки или null, если всё хорошо. */
export function checkBirthYear(year: number): string | null {
  const current = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > current) {
    return "Проверь год рождения.";
  }
  if (ageFromBirthYear(year) < MIN_AGE) {
    return `Tynysh — с ${MIN_AGE} лет. Пока рано, возвращайся позже.`;
  }
  return null;
}
