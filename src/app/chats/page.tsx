import Link from "next/link";
import { redirect } from "next/navigation";
import { profileQuery, requireUser, type Me } from "@/lib/session";
import { rpcErrorToRussian } from "@/lib/errors";
import { chatName, formatListTime, type ChatOverviewRow } from "@/lib/chat";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const { supabase, userId } = await requireUser();

  // Профиль и список чатов запрашиваем одновременно, а не друг за другом.
  // Одна функция в базе сразу отдаёт: с кем чат, последнее сообщение и непрочитанные.
  const [{ data: profile }, { data, error }] = await Promise.all([
    profileQuery(supabase, userId),
    supabase.rpc("chat_overview"),
  ]);
  if (!profile) redirect("/welcome");
  const me = profile as Me;
  const rows = (data ?? []) as ChatOverviewRow[];

  return (
    <AppShell meId={me.id} handle={me.handle} active="/chats">

      {error && (
        <div className="mx-2 mb-3 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
          {rpcErrorToRussian(error.code, error.message)}
        </div>
      )}

      <Link
        href="/dos"
        className="mb-1 flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50"
      >
        <Avatar name="Дос" isAI />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate font-bold">
            Дос
            <span className="rounded-full bg-dos px-1.5 py-0.5 text-[10px] text-dos-text">
              поддержка
            </span>
          </div>
          <div className="truncate text-xs opacity-60">
            Напиши, если тяжело. Переписку видишь только ты
          </div>
        </div>
      </Link>

      {rows.length === 0 && !error ? (
        <EmptyChats name={me.name} />
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.chat_id}>
              <Link
                href={`/chats/${row.chat_id}`}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50"
              >
                <Avatar name={chatName(row)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {row.chat_type === "group" && <span className="opacity-40">#</span>}
                    {chatName(row)}
                  </div>
                  <div className="truncate text-xs opacity-60">
                    {row.last_text
                      ? `${row.last_sender_id === me.id ? "Ты: " : ""}${row.last_text}`
                      : "Напиши первым"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] opacity-40">
                    {formatListTime(row.last_at)}
                  </span>
                  {row.unread_count > 0 && (
                    <span className="min-w-5 rounded-full bg-tynysh px-1.5 text-center text-[11px] font-bold text-white">
                      {row.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function EmptyChats({ name }: { name: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mb-3 text-5xl">💬</div>
      <div className="mb-1 text-lg font-extrabold">Привет, {name}!</div>
      <p className="mb-5 text-sm leading-relaxed text-tynysh-muted">
        Чатов пока нет. Найди человека по @юзернейму — и начнётся переписка.
      </p>
      <Link
        href="/contacts"
        className="inline-block rounded-xl bg-tynysh px-5 py-2.5 font-extrabold text-white"
      >
        Найти человека
      </Link>
    </div>
  );
}
