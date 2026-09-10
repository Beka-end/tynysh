// Настройки Supabase. Значения лежат в .env.local (см. .env.local.example).
// Эти два значения публичные — их можно отдавать в браузер.
// Секретные ключи (service_role, ANTHROPIC_API_KEY) сюда попадать НЕ должны.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Проект подключён к Supabase? Если нет — показываем инструкцию вместо ошибки. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
