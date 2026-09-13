"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { dbErrorToRussian } from "@/lib/errors";
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
}: {
  chatId: string;
  meId: string;
  chatType: ChatType;
  title: string;
  subtitle: string;
  members: Member[];
  initialMessages: Message[];
}) {
  const supabase = useMemo(() => createClient(), []);
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
      setError(dbErrorToRussian(sendError.code, sendError.message));
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
      </header>

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
    </div>
  );
}
