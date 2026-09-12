"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorToRussian } from "@/lib/errors";

/** Сколько ждём, прежде чем признать ссылку нерабочей. */
const TIMEOUT_MS = 10_000;

export function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase кладёт ответ либо в адрес после «#», либо в обычные параметры.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URL(window.location.href).searchParams;
    const failed =
      hash.get("error_description") ??
      hash.get("error") ??
      query.get("error_description") ??
      query.get("error");

    if (failed) {
      setError(authErrorToRussian(failed));
      return;
    }

    const supabase = createClient();
    let done = false;

    function enter() {
      if (done) return;
      done = true;
      router.replace("/");
      router.refresh();
    }

    // Библиотека сама разбирает адрес и сохраняет вход — ловим момент готовности.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) enter();
    });

    // На случай, если вход сохранился ещё до того, как мы начали слушать.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) enter();
    });

    const timer = setTimeout(() => {
      if (!done) {
        setError("Ссылка устарела или уже была использована. Запроси новую.");
      }
    }, TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  if (error) {
    return (
      <div className="mt-6">
        <div className="rounded-xl bg-alarm px-4 py-3 text-sm text-alarm-text">
          {error}
        </div>
        <Link
          href="/login"
          className="mt-4 inline-block font-bold text-tynysh underline"
        >
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return <p className="mt-6 text-tynysh-muted">Входим…</p>;
}
