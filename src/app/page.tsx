import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";


/**
 * Главная — это «регулировщик»: смотрит, кто пришёл, и отправляет куда нужно.
 * Не вошёл → /login. Вошёл, но нет профиля → /welcome. Всё есть → /chats.
 */
export default async function Home() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/welcome");
  redirect("/chats");
}
