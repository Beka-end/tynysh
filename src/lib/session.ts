import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Me = { id: string; name: string; handle: string; banned?: boolean | null };

/** Общая проверка для всех страниц: профиль заведён и аккаунт не забанен. */
export function guardProfile(profile: unknown): Me {
  const me = profile as Me | null;
  if (!me) redirect("/welcome");
  if (me.banned) redirect("/banned");
  return me;
}

/**
 * Только проверка входа. Профиль страница грузит сама — вместе со своими
 * данными, одним заходом, а не по очереди: так экран открывается заметно быстрее.
 */
export async function requireUser() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return { supabase, userId: user.id };
}

/** Запрос профиля — его можно запускать параллельно с остальными. */
export function profileQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  return supabase.from("profiles").select("id, name, handle, banned").eq("id", userId).maybeSingle();
}

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
    .select("id, name, handle, banned")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, me: guardProfile(profile) };
}
