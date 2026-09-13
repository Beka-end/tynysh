"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

export type FoundUser = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
};

/**
 * Поиск людей по @юзернейму или имени. Телефон не ищем и не показываем —
 * так договорились в CLAUDE.md.
 */
export function PeopleSearch({
  meId,
  picked = [],
  onPick,
  placeholder = "@юзернейм или имя",
  busyId,
}: {
  meId: string;
  picked?: string[];
  onPick: (user: FoundUser) => void;
  placeholder?: string;
  busyId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [list, setList] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Кого я заблокировал — тех в поиске не показываем.
  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("blocks")
      .select("blocked_id")
      .then(({ data }) =>
        setBlocked(((data ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id)),
      );
  }, []);

  useEffect(() => {
    // Убираем «@» и знаки, которые ломают запрос к базе.
    const term = query.trim().replace(/^@+/, "").replace(/[%,()"'\\*]/g, " ").trim();
    if (term.length < 2) {
      setList([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    let cancelled = false;
    // Ждём, пока человек допечатает — иначе запрос уходит на каждую букву.
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, handle, bio")
        .or(`handle.ilike.%${term}%,name.ilike.%${term}%`)
        .neq("id", meId)
        .limit(20);

      if (cancelled) return;
      setSearching(false);
      if (error) {
        setError("Не получилось найти. Проверь интернет и попробуй ещё раз.");
        setList([]);
        return;
      }
      setError("");
      setList(((data ?? []) as FoundUser[]).filter((u) => !blocked.includes(u.id)));
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, meId, blocked]);

  const shortQuery = query.trim().replace(/^@+/, "").length < 2;

  return (
    <div className="px-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mb-2 w-full rounded-xl border border-violet-100 px-3 py-2 outline-none focus:border-violet-400"
      />

      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}

      {list.map((user) => {
        const chosen = picked.includes(user.id);
        return (
          <button
            key={user.id}
            type="button"
            disabled={busyId === user.id}
            onClick={() => onPick(user)}
            className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${
              chosen ? "bg-violet-50" : "hover:bg-slate-50"
            } disabled:opacity-50`}
          >
            <Avatar name={user.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">
                {user.name} <span className="font-medium opacity-50">@{user.handle}</span>
              </div>
              {user.bio && <div className="truncate text-xs opacity-60">{user.bio}</div>}
            </div>
            {chosen && <span className="text-tynysh">✓</span>}
            {busyId === user.id && <span className="text-xs opacity-60">…</span>}
          </button>
        );
      })}

      {!searching && !error && list.length === 0 && (
        <p className="p-3 text-sm text-tynysh-muted">
          {shortQuery
            ? "Начни вводить @юзернейм или имя — хотя бы две буквы."
            : "Никого не нашли. Проверь написание или позови человека в Tynysh."}
        </p>
      )}
    </div>
  );
}
