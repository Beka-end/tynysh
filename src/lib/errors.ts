/** Переводим технические ошибки Supabase в человеческие фразы по-русски. */
export function authErrorToRussian(message: string): string {
  const m = message.toLowerCase();

  // Вход по паролю
  if (m.includes("invalid login credentials"))
    return "Почта или пароль не подходят. Если аккаунта ещё нет — нажми «Создать аккаунт».";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Такая почта уже зарегистрирована. Нажми «Войти», а если забыл пароль — войди по коду из письма.";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return "Пароль слишком короткий — нужно хотя бы 8 символов.";
  if (m.includes("email not confirmed"))
    return "Почта ещё не подтверждена. Открой письмо от Tynysh и нажми ссылку — или попроси владельца выключить подтверждение почты в Supabase.";
  if (m.includes("weak password") || m.includes("password is known to be weak"))
    return "Такой пароль слишком простой, его легко подобрать. Придумай другой.";

  // Сначала — что не так с самим номером или адресом
  if (m.includes("phone") && (m.includes("invalid") || m.includes("format")))
    return "Проверь номер телефона — он должен быть с кодом страны, например +7 701 234 56 78.";
  if (m.includes("email") && (m.includes("invalid") || m.includes("format")))
    return "Проверь адрес почты — похоже, в нём опечатка.";

  // Потом — что не так с отправкой кода.
  // Раньше здесь было написано про лимит бесплатного Supabase — но это лишь
  // одна из причин, и после подключения своего SMTP она уже неверна. Такой
  // текст уводил не туда, поэтому теперь называем настоящее место поломки.
  if (m.includes("email") && (m.includes("sending") || m.includes("smtp")))
    return "Письмо не ушло: сервер отправки отказал. Владельцу: Authentication → Emails → SMTP Settings (пароль — ключ Resend, порт 465), и домен в Resend должен быть Verified. Подробности ошибки — в Supabase → Logs → Auth Logs.";
  if (m.includes("sms") || m.includes("provider"))
    return "SMS не отправляются: в Supabase не подключён SMS-провайдер. Для проверки добавь тестовый номер в Authentication → Sign In / Providers → Phone → Test OTP. Либо войди по почте — вкладка сверху.";

  // Потом — ограничения по частоте
  if (m.includes("for security purposes")) {
    const sec = message.match(/(\d+)\s*seconds?/i)?.[1];
    return sec
      ? `Новый код можно запросить через ${sec} сек.`
      : "Новый код можно запросить чуть позже.";
  }
  // Лимит проекта на письма — это не вина человека, и ждать бесполезно.
  if (m.includes("email rate limit") || m.includes("over_email_send_rate_limit"))
    return "Кончился запас писем на час. У бесплатной почты Supabase он крошечный (около двух писем в час на весь сайт). Владельцу: подключи свой SMTP и подними лимит в Authentication → Rate Limits — шаги 19–21 в SETUP.md.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Слишком много попыток. Подожди пару минут.";

  // И только потом — про сам код
  if (m.includes("expired") || m.includes("invalid") || m.includes("incorrect"))
    return "Код неверный или уже устарел. Запроси новый.";

  if (m.includes("signups not allowed") || m.includes("disabled"))
    return "Этот способ входа выключен в настройках Supabase.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Нет связи с сервером. Проверь интернет и адрес Supabase в настройках.";

  return message;
}

/**
 * Техническая строка для владельца: настоящий текст ошибки рядом с понятной
 * фразой. Без неё приходится гадать — человеческий перевод по определению
 * теряет подробности, а именно они нужны, когда что-то настроено не так.
 */
export function authErrorTech(error: {
  message: string;
  status?: number;
  code?: string;
}): string {
  const parts = [error.message];
  if (error.code) parts.push(error.code);
  if (error.status) parts.push(`HTTP ${error.status}`);
  return parts.join(" · ");
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

/**
 * Ошибки вызова функций базы (start_dm, create_group, chat_overview).
 * Чаще всего причина одна: в Supabase ещё не выполнен supabase/stage2.sql.
 */
export function rpcErrorToRussian(code: string | undefined, message: string): string {
  const m = message.toLowerCase();
  if (code === "PGRST202" || code === "42883" || m.includes("schema cache"))
    return "В базе нет функций для чатов. Открой Supabase → SQL Editor и выполни файл supabase/stage2.sql.";
  if (code === "42P17" || m.includes("infinite recursion"))
    return "В базе старые правила доступа. Выполни supabase/stage2.sql в Supabase → SQL Editor.";
  // Наши собственные проверки внутри функций базы уже написаны по-русски.
  if (code === "P0001") return message;
  return dbErrorToRussian(code, message);
}
