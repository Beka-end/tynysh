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
        <p className="mt-1 mb-8 text-lg text-tynysh-muted">
          Мессенджер, где есть кому выслушать.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
            {authErrorToRussian(error)}
          </div>
        )}

        {isSupabaseConfigured ? <LoginTabs /> : <SetupHint />}

        <p className="mt-6 text-xs leading-relaxed text-[#8A85A3]">
          Дос — помощник для поддержки, а не врач. Если тебе плохо прямо сейчас —
          звони <b>150</b> (бесплатно, круглосуточно).
        </p>
        <p className="mt-3 text-xs text-[#8A85A3]">
          <Link href="/install" className="font-bold text-tynysh underline">
            Поставить Tynysh на телефон
          </Link>{" "}
          — без App Store, за два нажатия.
        </p>
        <p className="mt-3 text-xs text-[#8A85A3]">
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
