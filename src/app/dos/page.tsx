import { requireProfile } from "@/lib/session";
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
  const { supabase, me } = await requireProfile();

  // Историю Доса видит только сам человек — это правило стоит в базе (RLS).
  const { data: rows } = await supabase
    .from("dos_messages")
    .select("id, role, text, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const history = ((rows ?? []) as DosMessage[]).slice().reverse();

  const { data: statusRows } = await supabase.rpc("dos_status");
  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as Status | null;

  return (
    <DosChat
      meId={me.id}
      history={history}
      left={status?.plus_active ? null : (status?.left_total ?? null)}
      plus={Boolean(status?.plus_active)}
      freeTotal={status?.free_total ?? 0}
    />
  );
}
