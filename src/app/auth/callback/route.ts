import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Сюда человек попадает, нажав ссылку в письме.
 * Меняем одноразовый код из ссылки на постоянный вход и отправляем дальше.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  // Supabase присылает ссылку в одном из двух видов — поддерживаем оба.
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();
  let failed = searchParams.get("error_description") ?? searchParams.get("error");

  if (!failed && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = error?.message ?? null;
  } else if (!failed && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    failed = error?.message ?? null;
  } else if (!failed) {
    failed = "Ссылка неполная — открой письмо ещё раз или запроси новое.";
  }

  // За Vercel настоящий адрес сайта лежит в заголовке, а не в origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  if (failed) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(failed)}`);
  }
  return NextResponse.redirect(`${base}${next}`);
}
