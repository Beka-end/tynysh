"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Сколько ждём, прежде чем признать ссылку нерабочей. */
const TIMEOUT_MS = 15_000;

/**
 * Объясняем по-русски, что именно ответил Supabase.
 * Раньше на все случаи была одна фраза «ссылка устарела» — по ней непонятно,
 * что делать дальше.
 */
function explain(code: string | null, description: string | null): string {
  const text = `${code ?? ""} ${description ?? ""}`.toLowerCase();

  if (text.includes("otp_expired") || text.includes("expired")) {
    return "Эта ссылка больше не работает. Так бывает по трём причинам: открыто не самое последнее письмо (каждое новое письмо отключает предыдущее), почта сама проверила ссылку до тебя, или письмо пролежало больше часа. Запроси письмо заново и открой ссылку из самого свежего.";
  }
  if (text.includes("access_denied")) {
    return "Ссылка уже была использована. Второй раз по ней войти нельзя — запроси новое письмо.";
  }
  if (text.includes("redirect") || text.includes("not allowed")) {
    return "Supabase не разрешил вернуться на этот адрес. В Supabase → Authentication → URL Configuration добавь этот адрес в Redirect URLs (со звёздочками в конце).";
  }
  return description ?? "Войти по ссылке не получилось. Запроси письмо заново.";
}

export function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState("");
  // Технический код ответа Supabase — по нему видно точную причину.
  const [code, setCode] = useState("");

  useEffect(() => {
    // Supabase кладёт ответ либо в адрес после «#», либо в обычные параметры.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URL(window.location.href).searchParams;
    const pick = (key: string) => hash.get(key) ?? query.get(key);

    if (pick("error") || pick("error_code") || pick("error_description")) {
      setError(explain(pick("error_code") ?? pick("error"), pick("error_description")));
      setCode(pick("error_code") ?? pick("error") ?? "");
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
      if (done) return;
      // В адресе вообще не было ключей от входа — значит, по ссылке ничего не пришло.
      const empty = !hash.get("access_token") && !query.get("code");
      setError(
        empty
          ? "В ссылке не оказалось ключа для входа. Скорее всего, письмо открыто не до конца или ссылка обрезалась. Попробуй нажать на саму кнопку «Подтвердить» в письме, либо войди по номеру телефона."
          : "Войти по ссылке не получилось. Запроси письмо заново и открой ссылку из самого свежего.",
      );
      setCode(empty ? "нет ключа в адресе" : "ключ есть, но вход не сохранился");
    }, TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  if (error) {
    return (
      <div className="mt-6">
        <div className="rounded-xl bg-alarm px-4 py-3 text-left text-sm leading-relaxed text-alarm-text">
          {error}
        </div>
        {code && (
          <p className="mt-2 text-left text-[11px] text-tynysh-muted">
            Код ошибки: <b>{code}</b> — пришли его разработчику, если повторяется.
          </p>
        )}
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
