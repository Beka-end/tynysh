"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rpcErrorToRussian } from "@/lib/errors";
import { PeopleSearch, type FoundUser } from "@/components/PeopleSearch";

/** Создание группы: название + отмеченные люди. Создатель добавляется сам. */
export function NewGroup({ meId }: { meId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<FoundUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(user: FoundUser) {
    setPicked((prev) =>
      prev.some((p) => p.id === user.id)
        ? prev.filter((p) => p.id !== user.id)
        : [...prev, user],
    );
  }

  async function create() {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2 || busy) return;

    setBusy(true);
    setError("");

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_group", {
      group_title: cleanTitle,
      member_ids: picked.map((p) => p.id),
    });

    if (rpcError) {
      setBusy(false);
      setError(rpcErrorToRussian(rpcError.code, rpcError.message));
      return;
    }

    router.push(`/chats/${data as string}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-1 w-[calc(100%-0.5rem)] rounded-xl bg-tynysh py-2.5 font-bold text-white"
      >
        + Создать группу
      </button>
    );
  }

  return (
    <div className="mx-1 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 60))}
        placeholder="Название группы, например 11Б"
        className="w-full rounded-xl border border-violet-100 px-3 py-2 outline-none focus:border-violet-400"
      />

      <div className="px-1 pt-1 text-xs font-bold opacity-60">
        Кого добавить {picked.length > 0 && `· выбрано ${picked.length}`}
      </div>

      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {picked.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              className="rounded-full bg-tynysh-soft px-2.5 py-1 text-xs font-bold text-tynysh"
            >
              {p.name} ✕
            </button>
          ))}
        </div>
      )}

      <PeopleSearch
        meId={meId}
        picked={picked.map((p) => p.id)}
        onPick={toggle}
        placeholder="Найти по @юзернейму или имени"
      />

      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPicked([]);
            setTitle("");
            setError("");
          }}
          className="flex-1 rounded-xl py-2 font-bold opacity-60"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={create}
          disabled={title.trim().length < 2 || busy}
          className="flex-1 rounded-xl bg-tynysh py-2 font-bold text-white disabled:opacity-40"
        >
          {busy ? "Создаём…" : "Создать"}
        </button>
      </div>

      <p className="px-1 text-xs text-tynysh-muted">
        Людей можно добавить и потом — просто напиши им в личку.
      </p>
    </div>
  );
}
