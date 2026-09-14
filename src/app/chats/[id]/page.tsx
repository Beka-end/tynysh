import { notFound, redirect } from "next/navigation";
import { profileQuery, requireUser } from "@/lib/session";
import { membersLabel, type ChatType, type Member, type Message } from "@/lib/chat";
import { ChatRoom } from "./ChatRoom";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

type MemberRow = {
  user_id: string;
  role: string;
  last_read_at: string | null;
  profiles: { name: string; handle: string } | { name: string; handle: string }[] | null;
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();

  // Профиль, сам чат, участники и сообщения — одним заходом, а не по очереди.
  // Если я не участник — правила базы просто не отдадут чат, и будет «не найдено».
  const [{ data: profile }, { data: chat }, { data: memberRows }, { data: rows }] =
    await Promise.all([
      profileQuery(supabase, userId),
      supabase.from("chats").select("id, type, title").eq("id", id).maybeSingle(),
      supabase
        .from("chat_members")
        .select("user_id, role, last_read_at, profiles(name, handle)")
        .eq("chat_id", id),
      // Берём последние 200 сообщений (самые новые), потом разворачиваем по времени.
      supabase
        .from("messages")
        .select("id, sender_id, text, created_at")
        .eq("chat_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
  if (!profile) redirect("/welcome");
  const me = profile as { id: string; name: string; handle: string };
  if (!chat) notFound();

  const members: Member[] = ((memberRows ?? []) as MemberRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      role: row.role,
      last_read_at: row.last_read_at,
      name: profile?.name ?? "Человек",
      handle: profile?.handle ?? "",
    };
  });

  const messages = ((rows ?? []) as Message[]).slice().reverse();

  const partner = members.find((m) => m.user_id !== me.id);
  const isGroup = (chat.type as ChatType) === "group";

  // Заблокировал ли я собеседника (правила базы отдают только мои блокировки).
  let blocked = false;
  if (!isGroup && partner) {
    const { data: block } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("user_id", me.id)
      .eq("blocked_id", partner.user_id)
      .maybeSingle();
    blocked = Boolean(block);
  }

  return (
    <ChatRoom
      chatId={id}
      meId={me.id}
      chatType={chat.type as ChatType}
      title={isGroup ? (chat.title ?? "Группа") : (partner?.name ?? "Человек")}
      subtitle={
        isGroup
          ? membersLabel(members.length)
          : partner
            ? `@${partner.handle}`
            : "Собеседник вышел"
      }
      members={members}
      initialMessages={messages}
      partner={
        isGroup || !partner
          ? null
          : { id: partner.user_id, name: partner.name, handle: partner.handle }
      }
      blocked={blocked}
    />
  );
}
