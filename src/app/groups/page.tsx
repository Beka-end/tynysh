import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { rpcErrorToRussian } from "@/lib/errors";
import { membersLabel, type ChatOverviewRow } from "@/lib/chat";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { NewGroup } from "./NewGroup";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { supabase, me } = await requireProfile();

  const { data, error } = await supabase.rpc("chat_overview");
  const groups = ((data ?? []) as ChatOverviewRow[]).filter(
    (row) => row.chat_type === "group",
  );

  return (
    <AppShell handle={me.handle} active="/groups">
      <NewGroup meId={me.id} />

      {error && (
        <div className="mx-2 mt-3 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
          {rpcErrorToRussian(error.code, error.message)}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm leading-relaxed text-tynysh-muted">
          Групп пока нет. Группа — это чат на несколько человек: класс, команда,
          друзья.
        </p>
      ) : (
        <ul className="mt-2">
          {groups.map((group) => (
            <li key={group.chat_id}>
              <Link
                href={`/chats/${group.chat_id}`}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50"
              >
                <Avatar name={group.chat_title ?? "Группа"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    <span className="opacity-40">#</span>
                    {group.chat_title ?? "Группа"}
                  </div>
                  <div className="text-xs opacity-60">
                    {membersLabel(group.members_count)}
                  </div>
                </div>
                {group.unread_count > 0 && (
                  <span className="min-w-5 rounded-full bg-tynysh px-1.5 text-center text-[11px] font-bold text-white">
                    {group.unread_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
