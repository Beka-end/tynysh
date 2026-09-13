"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Ничего не рисует. Слушает новые сообщения и обновляет список чатов сам,
 * без нажатия «обновить». Правила базы пропускают только те чаты, где я участник.
 */
export function LiveChats() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chats-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
