"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { LiveNotifications } from "@/components/LiveNotifications";
import { dbErrorToRussian } from "@/lib/errors";
import { useRouter } from "next/navigation";
import {
  dayKey,
  dayLabel,
  formatTime,
  readUpTo,
  type ChatType,
  type Member,
  type Message,
} from "@/lib/chat";

export function ChatRoom({
  chatId,
  meId,
  chatType,
  title,
  subtitle,
  members: initialMembers,
  initialMessages,
  partner,
  blocked,
}: {
  chatId: string;
  meId: string;
  chatType: ChatType;
  title: string;
  subtitle: string;
  members: Member[];
  initialMessages: Message[];
  /** Собеседник в личном чате. У группы — null. */
  partner: { id: string; name: string; handle: string } | null;
  /** Я заблокировал этого человека? */
  blocked: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [showAbout, setShowAbout] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Кто как назван — чтобы в группе подписывать чужие сообщения.
  const names = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => (map[m.user_id] = m.name));
    return map;
  }, [members]);

  // До какого момента собеседники всё прочитали — по этому ставим вторую галочку.
  const readUntil = readUpTo(members, meId);

  // После блокировки/разблокировки сервер присылает другой набор сообщений.
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const addMessage = useCallback((incoming: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming].sort(
        (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
      );
    });
  }, []);

  // Отмечаем «я дочитал до сих пор» — из этого считаются непрочитанные и галочки.
  const markRead = useCallback(() => {
    void supabase
      .from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("user_id", meId);
  }, [supabase, chatId, meId]);

  // Живая связь: новые сообщения и чужие отметки о прочтении.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => addMessage(payload.new as Message),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_members",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === row.user_id ? { ...m, last_read_at: row.last_read_at } : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, chatId, addMessage]);

  // Открыли чат или пришло новое сообщение — значит, прочитано.
  useEffect(() => {
    markRead();
  }, [markRead, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function toggleBlock() {
    if (!partner || blockBusy) return;
    setBlockBusy(true);
    setError("");

    const { error: blockError } = blocked
      ? await supabase
          .from("blocks")
          .delete()
          .eq("user_id", meId)
          .eq("blocked_id", partner.id)
      : await supabase.from("blocks").insert({ user_id: meId, blocked_id: partner.id });

    setBlockBusy(false);
    if (blockError) {
      setError(dbErrorToRussian(blockError.code, blockError.message));
      return;
    }

    // Сообщения заблокированного пропадают сразу, не дожидаясь ответа сервера.
    if (!blocked) setMessages((prev) => prev.filter((m) => m.sender_id !== partner.id));
    setShowAbout(false);
    router.refresh();
  }

  async function send() {
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    setError("");
    setText("");

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, sender_id: meId, text: value })
      .select("id, sender_id, text, created_at")
      .single();

    setSending(false);
    if (sendError) {
      setText(value); // не потерять набранное
      setError(
        sendError.code === "42501"
          ? "Сообщение не отправилось: переписка с этим человеком закрыта."
          : dbErrorToRussian(sendError.code, sendError.message),
      );
      return;
    }
    addMessage(data as Message);
  }

  let lastDay = "";

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-violet-100 px-2 py-3">
        <Link href="/chats" className="px-1 text-2xl leading-none opacity-60" title="Назад">
          ‹
        </Link>
        <Avatar name={title} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">
            {chatType === "group" && <span className="opacity-40">#</span>}
            {title}
          </div>
          <div className="truncate text-xs opacity-60">{subtitle}</div>
        </div>
        {partner && (
          <button
            type="button"
            onClick={() => setShowAbout((v) => !v)}
            title="О человеке"
            className="px-2 text-xl leading-none opacity-50"
          >
            ⋯
          </button>
        )}
      </header>

      {partner && showAbout && (
        <div className="border-b border-violet-100 bg-white px-4 py-3 text-sm">
          <div className="font-bold">
            {partner.name} <span className="font-medium opacity-50">@{partner.handle}</span>
          </div>
          <button
            type="button"
            onClick={toggleBlock}
            disabled={blockBusy}
            className={`mt-2 w-full rounded-xl py-2 font-bold disabled:opacity-50 ${
              blocked ? "bg-tynysh-soft text-tynysh" : "bg-alarm text-alarm-text"
            }`}
          >
            {blockBusy
              ? "Секунду…"
              : blocked
                ? "Разблокировать"
                : "Заблокировать"}
          </button>
          <p className="mt-2 text-xs leading-relaxed text-tynysh-muted">
            {blocked
              ? "Сейчас этот человек не может тебе писать, а его сообщения ты не видишь."
              : "После блокировки он не сможет тебе писать, а его сообщения пропадут из чатов. Он об этом не узнает. Разблокировать можно в любой момент."}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-tynysh-muted">
            Если тебе угрожают или просят фото — расскажи взрослому, которому доверяешь,
            или звони <b>150</b>.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-tynysh-bg px-3 py-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-tynysh-muted">
            {chatType === "group"
              ? "Группа создана. Первое сообщение — за тобой."
              : "Напиши первым. Простое «привет» — уже начало."}
          </p>
        )}

        {messages.map((message) => {
          const mine = message.sender_id === meId;
          const key = dayKey(message.created_at);
          const newDay = key !== lastDay;
          lastDay = key;
          const read = mine && Date.parse(message.created_at) <= readUntil;

          return (
            <div key={message.id}>
              {newDay && (
                <div className="my-3 text-center text-[11px] font-bold uppercase opacity-40">
                  {dayLabel(message.created_at)}
                </div>
              )}
              <div className={`mb-1.5 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] whitespace-pre-wrap px-3.5 py-2 text-[15px] leading-snug ${
                    mine
                      ? "rounded-2xl rounded-br-md bg-tynysh text-white"
                      : "rounded-2xl rounded-bl-md bg-white"
                  }`}
                >
                  {!mine && chatType === "group" && (
                    <div className="mb-0.5 text-xs font-bold opacity-60">
                      {names[message.sender_id ?? ""] ?? "Человек"}
                    </div>
                  )}
                  {message.text}
                  <div
                    className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "opacity-40"}`}
                  >
                    {formatTime(message.created_at)}
                    {mine && (read ? " ✓✓" : " ✓")}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="bg-alarm px-4 py-2 text-sm text-alarm-text">{error}</div>
      )}

      {blocked && partner ? (
        <div className="border-t border-violet-100 p-3 text-center text-sm">
          <p className="mb-2 text-tynysh-muted">
            Ты заблокировал(а) {partner.name}. Переписка закрыта с обеих сторон.
          </p>
          <button
            type="button"
            onClick={toggleBlock}
            disabled={blockBusy}
            className="font-bold text-tynysh underline disabled:opacity-50"
          >
            Разблокировать
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2 border-t border-violet-100 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 4000))}
            placeholder="Сообщение"
            className="flex-1 rounded-full bg-tynysh-bg px-4 py-2.5 outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="rounded-full bg-tynysh px-5 font-bold text-white disabled:opacity-40"
          >
            ↑
          </button>
        </form>
      )}

      <LiveNotifications meId={meId} currentChatId={chatId} />
    </div>
  );
}
