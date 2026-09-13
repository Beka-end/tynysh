import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
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
  const { supabase, me } = await requireProfile();

  // Если я не участник — правила базы просто не отдадут чат, и будет «не найдено».
  const { data: chat } = await supabase
    .from("chats")
    .select("id, type, title")
    .eq("id", id)
    .maybeSingle();
  if (!chat) notFound();

  const { data: memberRows } = await supabase
    .from("chat_members")
    .select("user_id, role, last_read_at, profiles(name, handle)")
    .eq("chat_id", id);

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

  // Берём последние 200 сообщений (самые новые), потом разворачиваем по времени.
  const { data: rows } = await supabase
    .from("messages")
    .select("id, sender_id, text, created_at")
    .eq("chat_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const messages = ((rows ?? []) as Message[]).slice().reverse();

  const partner = members.find((m) => m.user_id !== me.id);
  const isGroup = (chat.type as ChatType) === "group";

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
    />
  );
}
