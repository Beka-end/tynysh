import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Обновляет сессию пользователя на каждом запросе,
 * иначе токен протухает и человека выкидывает из аккаунта.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  // Нет куки входа — проверять нечего. Без этого каждая страница гостя
  // ждала лишний запрос к Supabase.
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (!hasSession) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Важно: именно getUser() — он проверяет токен на сервере Supabase.
  await supabase.auth.getUser();

  return response;
}
