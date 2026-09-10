/** Приводим номер к международному виду: +77011234567 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  // 8 701 ... → 7 701 ...
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  // 701 ... → 7 701 ...
  if (digits.length === 10 && digits.startsWith("7")) digits = "7" + digits;

  return "+" + digits;
}

/** Похоже на настоящий номер? (10–15 цифр, как требует стандарт E.164) */
export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw).slice(1);
  return digits.length >= 10 && digits.length <= 15;
}

/** Красивый вид для показа на экране: +7 701 234 56 78 */
export function formatPhone(raw: string): string {
  const d = normalizePhone(raw).slice(1);
  if (d.length === 11 && d.startsWith("7")) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return "+" + d;
}
