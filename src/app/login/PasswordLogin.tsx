"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorToRussian } from "@/lib/errors";
import { isValidEmail, normalizeEmail } from "@/lib/email";

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400";

/** Обычный вход: почта и пароль. Письма для этого не нужны вообще. */
export function PasswordLogin({ onWantCode }: { onWantCode: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const emailOk = isValidEmail(email);
  const passwordOk = password.length >= 8;
  const canSubmit = emailOk && passwordOk && !busy;

  async function run(mode: "in" | "up") {
    setBusy(true);
    setError("");
    setNotice("");

    const supabase = createClient();
    const credentials = { email: normalizeEmail(email), password };

    const { data, error: authError } =
      mode === "in"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setBusy(false);

    if (authError) {
      setError(authErrorToRussian(authError.message));
      return;
    }

    // Если в Supabase включено подтверждение почты, сессии сразу не будет.
    if (!data.session) {
      setNotice(
        "Аккаунт создан. Теперь подтверди почту по письму — и возвращайся сюда войти.",
      );
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) run("in");
      }}
    >
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="почта@example.com"
        inputMode="email"
        autoComplete="email"
        className={inputClass}
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль, минимум 8 символов"
        type="password"
        autoComplete="current-password"
        className={inputClass}
      />

      <button type="submit" disabled={!canSubmit} className="w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40">
        {busy ? "Секунду…" : "Войти"}
      </button>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => run("up")}
        className="w-full rounded-xl bg-tynysh-soft py-3 font-bold text-tynysh disabled:opacity-40"
      >
        Создать аккаунт
      </button>

      {password.length > 0 && !passwordOk && (
        <p className="px-1 text-xs text-alarm-text">Пароль короткий — нужно хотя бы 8 символов.</p>
      )}
      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl bg-dos px-3 py-2 text-sm text-dos-text">{notice}</div>
      )}

      <p className="text-xs leading-relaxed text-tynysh-muted">
        Первый раз? Впиши почту, придумай пароль и нажми «Создать аккаунт».
        Почту никто не увидит — другие видят только твой @юзернейм.
      </p>

      <button
        type="button"
        onClick={onWantCode}
        className="w-full py-1 text-sm text-tynysh-muted underline"
      >
        Забыл пароль — войти по коду из письма
      </button>
    </form>
  );
}
