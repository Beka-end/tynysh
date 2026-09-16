"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Объясняем по-русски, что именно не получилось. */
function explain(code: string | null, description: string | null): string {
  const text = `${code ?? ""} ${description ?? ""}`.toLowerCase();

  if (
    text.includes("code verifier") ||
    text.includes("flow state") ||
    text.includes("code challenge") ||
    text.includes("pkce")
  ) {
    return "Ссылку нужно открывать в том же браузере, где ты запрашивал вход: ключ от входа остаётся там и на другое устройство не переносится. Открой сайт на том же устройстве и запроси вход заново.";
  }
  if (text.includes("otp_expired") || text.includes("expired")) {
    return "Эта ссылка больше не работает. Так бывает по трём причинам: открыто не самое последнее письмо (каждое новое отключает предыдущее), почта сама проверила ссылку до тебя, или письмо пролежало больше часа. Запроси письмо заново и открой ссылку из самого свежего.";
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
  // Технический код ответа — по нему причина определяется точно.
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

    /**
     * Раньше мы просто ждали, пока библиотека разберёт адрес сама, и при неудаче
     * показывали «вход не сохранился» — без причины. Теперь заканчиваем вход
     * сами и говорим вслух, что пошло не так.
     */
    async function finish() {
      const returned = query.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (returned) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(returned);
        if (exchangeError) {
          if (done) return;
          setError(explain(null, exchangeError.message));
          setCode(exchangeError.message.slice(0, 80));
          return;
        }
        enter();
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (done) return;
          setError(explain(null, sessionError.message));
          setCode(sessionError.message.slice(0, 80));
          return;
        }
        enter();
        return;
      }

      // Ключа в адресе нет. Возможно, вход уже сохранён с прошлого раза.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        enter();
        return;
      }
      if (done) return;
      setError(
        "В ссылке не оказалось ключа для входа. Скорее всего, письмо открыто не до конца или ссылка обрезалась. Запроси вход заново.",
      );
      setCode("нет ключа в адресе");
    }

    // Библиотека может успеть разобрать адрес раньше нас — тогда просто входим.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) enter();
    });

    void finish();

    return () => {
      subscription.unsubscribe();
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
