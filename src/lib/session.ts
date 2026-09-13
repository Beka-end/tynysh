import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Me = { id: string; name: string; handle: string };

/**
 * Общая проверка для всех внутренних страниц:
 * нет настроек Supabase → на вход, нет сессии → на вход, нет профиля → знакомиться.
 */
export async function requireProfile() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, handle")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/welcome");

  return { supabase, me: profile as Me };
}
