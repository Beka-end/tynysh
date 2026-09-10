/** Переводим технические ошибки Supabase в человеческие фразы по-русски. */
export function authErrorToRussian(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid phone") || m.includes("phone number"))
    return "Проверь номер телефона — он должен быть с кодом страны, например +7 701 234 56 78.";
  if (m.includes("expired") || m.includes("invalid") || m.includes("incorrect"))
    return "Код неверный или уже устарел. Запроси новый.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Слишком много попыток. Подожди пару минут.";
  if (m.includes("for security purposes")) {
    const sec = message.match(/(\d+)\s*seconds?/i)?.[1];
    return sec
      ? `Новый код можно запросить через ${sec} сек.`
      : "Новый код можно запросить чуть позже.";
  }
  if (m.includes("provider") || m.includes("sms"))
    return "SMS не отправляются: в Supabase не подключён SMS-провайдер. Для проверки добавь тестовый номер в Authentication → Sign In / Providers → Phone → Test OTP.";
  if (m.includes("signups not allowed") || m.includes("disabled"))
    return "Регистрация по телефону выключена в настройках Supabase.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Нет связи с сервером. Проверь интернет и адрес Supabase в .env.local.";

  return message;
}

/** Ошибки базы: 23505 — нарушено «уникальное» правило (например, занят @юзернейм). */
export function dbErrorToRussian(code: string | undefined, message: string): string {
  if (code === "23505") return "Такой @юзернейм уже занят. Придумай другой.";
  if (code === "23514") return "Данные не прошли проверку. Проверь юзернейм и год рождения.";
  if (code === "42501")
    return "Нет прав на запись. Проверь, что выполнил supabase/schema.sql целиком (там включается RLS и политики).";
  if (code === "42P01")
    return "В базе нет нужных таблиц. Выполни supabase/schema.sql в SQL Editor.";
  return message;
}
