import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Клиент Supabase для кода, который выполняется в браузере.
 *
 * Важно про вход по ссылке: @supabase/ssr всегда ставит flowType "pkce" и
 * перезаписывает то, что передашь ты (видно в её createBrowserClient).
 * PKCE означает, что завершить вход можно ТОЛЬКО в том браузере, где его
 * начали: там остаётся ключ-половинка. Поэтому ссылка из письма, открытая
 * на другом устройстве, не сработает — это не поломка, а устройство защиты.
 * Кросс-устройственный вход даёт код из письма: ему ключ-половинка
 * не нужна. Код появится в письме после настройки своей отправки (шаг 21).
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
