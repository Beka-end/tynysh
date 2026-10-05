import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { authErrorToRussian } from "@/lib/errors";
import { LoginTabs } from "./LoginTabs";
import { SetupHint } from "./SetupHint";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";


export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Сюда попадаем, если ссылка из письма не сработала.
  const { error } = await searchParams;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <Logo big />
        {/* Первое, что человек читает, открыв сайт. Он пришёл не покупать и
            не изучать — ему тяжело. Поэтому здесь не обещание пользы, а
            разрешение не держать лицо. «Тыныш» по-казахски и значит
            «спокойно»: название само говорит то, что нужно сказать. */}
        <p className="mt-2 text-2xl font-extrabold leading-tight">
          Выдохни. Здесь можно как есть.
        </p>
        <p className="mt-2 text-base leading-relaxed text-tynysh-muted">
          Не надо подбирать слова и объяснять, почему. Тебя не оценят,
          не перебьют и никому не перескажут.
        </p>
        {/* Два имени — приложение и собеседник — человек видит как путаницу,
            пока ему не сказали, что они значат. Сказали — и это уже не две
            непонятные вещи, а одна понятная фраза. */}
        <p className="mt-3 mb-8 text-sm leading-relaxed text-tynysh-muted">
          <b>Tynysh</b> — «спокойно» по-казахски. Внутри тебя ждёт{" "}
          <b>Дос</b> — «друг».
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
            {authErrorToRussian(error)}
          </div>
        )}

        {isSupabaseConfigured ? <LoginTabs /> : <SetupHint />}

        <p className="mt-6 text-xs leading-relaxed text-tynysh-muted">
          Дос — помощник для поддержки, а не врач. Если тебе плохо прямо сейчас —
          звони <b>150</b> (бесплатно, круглосуточно).
        </p>
        <p className="mt-3 text-xs text-tynysh-muted">
          <Link href="/install" className="font-bold text-tynysh underline">
            Поставить Tynysh на телефон
          </Link>{" "}
          — без App Store, за два нажатия.
        </p>
        <p className="mt-3 text-xs text-tynysh-muted">
          Входя, ты соглашаешься с{" "}
          <Link href="/terms" className="underline">
            условиями
          </Link>{" "}
          и{" "}
          <Link href="/privacy" className="underline">
            политикой конфиденциальности
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
