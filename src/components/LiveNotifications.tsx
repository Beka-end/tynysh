"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NewMessage = {
  id: string;
  chat_id: string;
  sender_id: string | null;
  text: string;
};

/**
 * Уведомления о новых сообщениях. Работает, пока вкладка Tynysh открыта —
 * в том числе когда она в фоне или окно свёрнуто.
 * Уведомления при полностью закрытом сайте — это push, он на этапе 5 вместе с PWA.
 *
 * Заодно обновляет список чатов, когда приходит сообщение или тебя добавили в группу.
 */
export function LiveNotifications({
  meId,
  currentChatId,
  refreshList = false,
  withButton = false,
}: {
  meId: string;
  currentChatId?: string;
  refreshList?: boolean;
  withButton?: boolean;
}) {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission | "none">("none");
  const [unseen, setUnseen] = useState(0);
  const baseTitle = useRef("Tynysh");

  useEffect(() => {
    baseTitle.current = document.title;
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  // Счётчик в заголовке вкладки: «(2) Tynysh». Сбрасывается, когда вернулся.
  useEffect(() => {
    document.title = unseen > 0 ? `(${unseen}) ${baseTitle.current}` : baseTitle.current;
  }, [unseen]);

  useEffect(() => {
    function onVisible() {
      if (!document.hidden) setUnseen(0);
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const notify = useCallback(
    async (message: NewMessage) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }

      // Имя отправителя берём отдельно: в самом событии его нет.
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", message.sender_id ?? "")
        .maybeSingle();

      const note = new Notification(data?.name ?? "Новое сообщение", {
        body: message.text.slice(0, 120),
        tag: message.chat_id, // сообщения из одного чата не громоздятся стопкой
      });
      note.onclick = () => {
        window.focus();
        router.push(`/chats/${message.chat_id}`);
        note.close();
      };
    },
    [router],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as NewMessage;
          if (message.sender_id === meId) return;
          if (refreshList) router.refresh();

          // Если этот чат открыт и человек смотрит на него — уведомление лишнее.
          if (message.chat_id === currentChatId && !document.hidden) return;

          setUnseen((n) => n + 1);
          if (document.hidden) void notify(message);
        },
      )
      .on(
        // Меня добавили в группу — список чатов должен обновиться сам.
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_members" },
        () => {
          if (refreshList) router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, currentChatId, refreshList, router, notify]);

  if (!withButton || permission === "granted" || permission === "none") return null;

  if (permission === "denied") {
    return (
      <p className="mx-2 mb-3 rounded-xl bg-tynysh-soft px-3 py-2 text-xs leading-relaxed text-tynysh-muted">
        Уведомления запрещены в настройках браузера. Включить можно там же, где
        разрешения для сайта (замочек рядом с адресом).
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void Notification.requestPermission().then(setPermission);
      }}
      className="mx-2 mb-3 w-[calc(100%-1rem)] rounded-xl bg-tynysh-soft px-3 py-2.5 text-left text-sm font-bold text-tynysh"
    >
      🔔 Включить уведомления о новых сообщениях
      <span className="mt-0.5 block text-xs font-medium text-tynysh-muted">
        Приходят, пока Tynysh открыт хотя бы в фоновой вкладке. На iPhone — после
        добавления сайта на экран «Домой».
      </span>
    </button>
  );
}
