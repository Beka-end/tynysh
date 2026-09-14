import { redirect } from "next/navigation";
import { profileQuery, requireUser } from "@/lib/session";
import { DosChat, type DosMessage } from "./DosChat";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

type Status = {
  plus_active: boolean;
  used_total: number;
  left_total: number;
  free_total: number;
};

export default async function DosPage() {
  const { supabase, userId } = await requireUser();

  // Профиль, история и остаток пакета — одним заходом.
  // Историю Доса видит только сам человек — это правило стоит в базе (RLS).
  const [{ data: profile }, { data: rows }, { data: statusRows }] = await Promise.all([
    profileQuery(supabase, userId),
    supabase
      .from("dos_messages")
      .select("id, role, text, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("dos_status"),
  ]);
  if (!profile) redirect("/welcome");

  const history = ((rows ?? []) as DosMessage[]).slice().reverse();
  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as Status | null;

  return (
    <DosChat
      meId={userId}
      history={history}
      left={status?.plus_active ? null : (status?.left_total ?? null)}
      plus={Boolean(status?.plus_active)}
      freeTotal={status?.free_total ?? 0}
    />
  );
}
