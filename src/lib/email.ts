/** Простая проверка адреса: есть имя, «собака», домен с точкой. */
export function isValidEmail(raw: string): boolean {
  const value = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
