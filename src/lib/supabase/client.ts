import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Клиент Supabase для кода, который выполняется в браузере. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Ссылку из письма человек часто открывает в другом браузере (почта на
      // телефоне, сайт на компьютере). При строгом режиме такая ссылка не
      // срабатывает, поэтому вход по ссылке делаем не привязанным к браузеру.
      flowType: "implicit",
    },
  });
}
