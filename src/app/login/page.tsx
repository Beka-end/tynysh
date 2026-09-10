import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { PhoneLogin } from "./PhoneLogin";
import { SetupHint } from "./SetupHint";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";


export default async function LoginPage() {
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

        {isSupabaseConfigured ? <PhoneLogin /> : <SetupHint />}

        <p className="mt-6 text-xs leading-relaxed text-[#8A85A3]">
          Дос — помощник для поддержки, а не врач. Если тебе плохо прямо сейчас —
          звони <b>150</b> (бесплатно, круглосуточно).
        </p>
      </div>
    </main>
  );
}
