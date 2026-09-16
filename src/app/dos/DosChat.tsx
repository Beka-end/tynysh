"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { dayKey, dayLabel, formatTime } from "@/lib/chat";
import { DOS_MAX_INPUT } from "@/lib/dos-config";

export type DosMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

const STARTERS = [
  "Стресс из-за учёбы",
  "Поссорился с другом",
  "Не могу уснуть",
  "Меня травят",
  "Просто тяжело",
];

export function DosChat({
  history,
  left: initialLeft,
  plus,
  freeTotal,
}: {
  meId: string;
  history: DosMessage[];
  left: number | null;
  plus: boolean;
  freeTotal: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<DosMessage[]>(history);
  const [left, setLeft] = useState<number | null>(initialLeft);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing]);

  function add(role: "user" | "assistant", body: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random()}`,
        role,
        text: body,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async function send(value: string) {
    const clean = value.trim();
    if (!clean || typing) return;

    setText("");
    setError("");
    add("user", clean);
    setTyping(true);

    let response: Response;
    try {
      response = await fetch("/api/dos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
    } catch {
      setTyping(false);
      setError("Нет связи с сервером. Проверь интернет.");
      return;
    }

    // Отказ и ошибки приходят обычным JSON, сам ответ Доса — потоком.
    if (response.headers.get("Content-Type")?.includes("application/json")) {
      const data = (await response.json()) as {
        text?: string | null;
        crisis?: boolean;
        left?: number | null;
        limitReached?: boolean;
        error?: string;
      };
      setTyping(false);
      if (data.crisis) setCrisis(true);
      if (typeof data.left === "number") setLeft(data.left);
      if (data.text) add("assistant", data.text);
      if (data.limitReached) setPaywall(true);
      else if (data.error) setError(data.error);
      return;
    }

    if (response.headers.get("X-Dos-Crisis") === "1") setCrisis(true);
    const leftHeader = response.headers.get("X-Dos-Left");
    if (leftHeader) setLeft(Number(leftHeader));
    else if (response.headers.get("X-Dos-Plus") === "1") setLeft(null);

    // Показываем ответ по мере того, как Дос его пишет.
    const id = `dos-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id, role: "assistant", text: "", created_at: new Date().toISOString() },
    ]);
    setTyping(false);

    const reader = response.body?.getReader();
    if (!reader) {
      setError("Дос не ответил. Попробуй ещё раз.");
      return;
    }
    const decoder = new TextDecoder();
    let answer = "";
    try {
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        answer += decoder.decode(chunk, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text: answer } : m)),
        );
      }
    } catch {
      setError("Связь оборвалась на середине ответа.");
    }

    if (!answer.trim()) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setError("Дос не ответил. Попробуй ещё раз.");
    }
  }

  async function clearHistory() {
    if (!confirm("Удалить всю переписку с Досом? Это навсегда.")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("dos_messages")
      .delete()
      .not("id", "is", null);
    if (deleteError) {
      setError("Не получилось удалить. Попробуй ещё раз.");
      return;
    }
    setMessages([]);
    setCrisis(false);
    router.refresh();
  }

  let lastDay = "";

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-violet-100 px-2 py-3">
        <Link href="/chats" className="px-1 text-2xl leading-none opacity-60" title="Назад">
          ‹
        </Link>
        <Avatar name="Дос" isAI size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">Дос</div>
          <div className="truncate text-xs opacity-60">
            всегда на связи · не заменяет врача
          </div>
        </div>
        <Link
          href="/mood"
          title="Дневник настроения"
          className="rounded-full px-2 py-1 text-xs font-bold text-tynysh hover:bg-tynysh-soft"
        >
          Дневник
        </Link>
        <button
          type="button"
          onClick={clearHistory}
          title="Удалить всю переписку"
          className="rounded-full px-2 py-1 text-xs text-tynysh-muted hover:bg-tynysh-soft"
        >
          Очистить
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-tynysh-bg px-3 py-4">
        {crisis && (
          <div className="mb-3 rounded-2xl bg-alarm p-4 text-sm text-[#5A1F17]">
            <div className="mb-1 text-base font-bold">
              Ты не один. Помощь есть прямо сейчас
            </div>
            <div>
              📞 <b>150</b> — линия доверия, бесплатно, 24/7
            </div>
            <div>
              📞 <b>111</b> — контакт-центр для детей и семьи
            </div>
            <div>
              🚨 <b>112</b> — если опасность прямо сейчас
            </div>
            <div className="mt-2 opacity-80">
              Расскажи близкому человеку. Дос останется с тобой в чате.
            </div>
            <button
              type="button"
              onClick={() => setCrisis(false)}
              className="mt-2 text-xs underline opacity-70"
            >
              Скрыть
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="mt-8 px-4 text-center">
            <div className="mb-2 text-4xl">☼</div>
            <p className="text-sm leading-relaxed text-tynysh-muted">
              Это Дос. Ему можно написать то, что не говоришь вслух. Переписку не
              видит никто, кроме тебя, — даже родители и админы.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const mine = message.role === "user";
          const key = dayKey(message.created_at);
          const newDay = key !== lastDay;
          lastDay = key;

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
                      : "rounded-2xl rounded-bl-md bg-dos text-[#3A2E12]"
                  }`}
                >
                  {message.text}
                  <div
                    className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "opacity-40"}`}
                  >
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {typing && <div className="pl-2 text-sm opacity-50">Дос печатает…</div>}
        <div ref={endRef} />
      </div>

      {messages.length < 3 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => setText(starter)}
              className="shrink-0 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-sm"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {error && <div className="bg-alarm px-4 py-2 text-sm text-alarm-text">{error}</div>}

      {!plus && left !== null && (
        <button
          type="button"
          onClick={() => setPaywall(true)}
          className="px-4 pb-1 pt-2 text-left text-xs text-tynysh-muted"
        >
          {left > 0
            ? `Осталось ${left} бесплатных сообщений Досу из ${freeTotal}`
            : "Бесплатные сообщения закончились — открыть Дос Plus"}
        </button>
      )}

      <form
        className="flex gap-2 border-t border-violet-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, DOS_MAX_INPUT))}
          placeholder="Что случилось?"
          className="flex-1 rounded-full bg-tynysh-bg px-4 py-2.5 outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || typing}
          className="rounded-full bg-tynysh px-5 font-bold text-white disabled:opacity-40"
        >
          ↑
        </button>
      </form>

      {paywall && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setPaywall(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-2xl font-extrabold">Дос Plus</div>
            <p className="mb-4 text-sm opacity-70">
              Бесплатно — {freeTotal} сообщений Досу на знакомство. С Plus:
            </p>
            <ul className="mb-5 space-y-1.5 text-sm">
              <li>✓ Разговоры с Досом без лимита</li>
              <li>✓ Дос помнит разговоры намного дольше</li>
              <li>✓ Итог недели по дневнику настроения</li>
              <li>✓ Никакой рекламы — никогда</li>
            </ul>
            <div className="mb-3 flex gap-2">
              <div className="flex-1 rounded-2xl border-2 border-tynysh p-3">
                <div className="font-extrabold">990 ₸</div>
                <div className="text-xs opacity-60">в месяц</div>
              </div>
              <div className="flex-1 rounded-2xl border border-violet-100 p-3">
                <div className="font-extrabold">7 900 ₸</div>
                <div className="text-xs opacity-60">в год · −33%</div>
              </div>
            </div>
            <Link
              href="/plus"
              className="block w-full rounded-xl bg-tynysh py-3 text-center font-extrabold text-white"
            >
              Оплатить через Kaspi
            </Link>
            <button
              type="button"
              onClick={() => setPaywall(false)}
              className="w-full py-2 text-sm opacity-60"
            >
              Не сейчас
            </button>
            <p className="mt-2 text-[11px] leading-relaxed opacity-50">
              Оплата ручная: платишь по ссылке Kaspi и присылаешь скриншот.
              Обычные чаты и группы бесплатны всегда. Если тебе плохо прямо сейчас — звони 150, это
              бесплатно и без всякой подписки.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
