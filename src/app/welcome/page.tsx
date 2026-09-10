import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "./ProfileForm";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";


export default async function WelcomePage() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Профиль уже есть — второй раз заполнять не надо.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/chats");

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-4 mb-1 text-2xl font-extrabold">Познакомимся</h1>
        <p className="mb-6 text-sm text-tynysh-muted">
          Имя и @юзернейм увидят другие. Номер телефона — никто.
        </p>
        <ProfileForm userId={user.id} />
      </div>
    </main>
  );
}
