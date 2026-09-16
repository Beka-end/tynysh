"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorToRussian } from "@/lib/errors";

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400";

/** Смена пароля. Заодно это способ задать пароль тем, кто вошёл по коду из письма. */
export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const ok = password.length >= 8;

  async function save() {
    setBusy(true);
    setError("");
    setDone(false);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setBusy(false);
    if (updateError) {
      setError(authErrorToRussian(updateError.message));
      return;
    }
    setPassword("");
    setDone(true);
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok && !busy) save();
      }}
    >
      <div className="text-sm font-bold">Сменить пароль</div>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="new-password"
        placeholder="Новый пароль, минимум 8 символов"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={!ok || busy}
        className="w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40"
      >
        {busy ? "Сохраняем…" : "Сохранить пароль"}
      </button>

      {done && (
        <div className="rounded-xl bg-[#E6F7EF] px-3 py-2 text-sm">
          Пароль изменён. Запомни его — восстановить письмом пока нельзя.
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}
    </form>
  );
}
