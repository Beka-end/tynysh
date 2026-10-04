import { guardProfile, profileQuery, requireUser } from "@/lib/session";
import { DosChat, type DosMessage } from "./DosChat";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

type Status = {
  plus_active: boolean;
  used_total: number;
  left_total: number;
  free_total: number;
  plus_left_today: number;
};

export default async function DosPage() {
  const { supabase, userId } = await requireUser();

  // Профиль, история и остаток пакета — одним заходом.
  // Историю Доса видит только сам человек — это правило стоит в базе (RLS).
  const [{ data: profile }, { data: rows }, { data: statusRows }, { data: capRow }] =
    await Promise.all([
      profileQuery(supabase, userId),
      supabase
        .from("dos_messages")
        .select("id, role, text, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.rpc("dos_status"),
      // Потолок Plus нужен окну оплаты: обещать «без лимита», когда лимит есть,
      // нельзя — человек платит в этом окне.
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "dos_plus_daily")
        .maybeSingle(),
    ]);
  guardProfile(profile);

  const history = ((rows ?? []) as DosMessage[]).slice().reverse();
  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as Status | null;

  return (
    <DosChat
      meId={userId}
      history={history}
      left={status?.plus_active ? null : (status?.left_total ?? null)}
      plus={Boolean(status?.plus_active)}
      freeTotal={status?.free_total ?? 0}
      plusDaily={((capRow as { value?: number } | null)?.value ?? 0) || null}
      plusLeftToday={status?.plus_active ? (status?.plus_left_today ?? null) : null}
    />
  );
}
