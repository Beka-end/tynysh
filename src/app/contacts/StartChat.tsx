"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rpcErrorToRussian } from "@/lib/errors";
import { PeopleSearch, type FoundUser } from "@/components/PeopleSearch";

/** Нашёл человека — нажал — открылся личный чат (или старый, если он уже был). */
export function StartChat({ meId, myHandle }: { meId: string; myHandle: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function openChat(user: FoundUser) {
    setBusyId(user.id);
    setError("");

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("start_dm", { target: user.id });

    if (rpcError) {
      setBusyId(null);
      setError(rpcErrorToRussian(rpcError.code, rpcError.message));
      return;
    }

    router.push(`/chats/${data as string}`);
    router.refresh();
  }

  return (
    <div>
      <PeopleSearch meId={meId} onPick={openChat} busyId={busyId} />

      {error && (
        <div className="mx-1 mt-2 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
          {error}
        </div>
      )}

      <p className="mx-1 mt-4 rounded-xl bg-tynysh-soft px-3 py-2.5 text-xs leading-relaxed text-tynysh-muted">
        Твой @юзернейм — <b className="text-tynysh">@{myHandle}</b>. Дай его друзьям,
        чтобы они тебя нашли. Номер телефона в Tynysh не видит никто.
      </p>
    </div>
  );
}
