"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbErrorToRussian } from "@/lib/errors";
import { HANDLE_RE, MIN_AGE, checkBirthYear, cleanHandle } from "@/lib/profile";

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400";

export function ProfileForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const birthYear = Number(year);
  const yearError = year.length === 4 ? checkBirthYear(birthYear) : null;
  const handleOk = HANDLE_RE.test(handle);
  const canSubmit = name.trim().length > 0 && handleOk && year.length === 4 && !yearError;

  async function submit() {
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      handle,
      name: name.trim(),
      birth_year: birthYear,
    });

    if (error) {
      setBusy(false);
      setError(dbErrorToRussian(error.code, error.message));
      return;
    }

    router.replace("/chats");
    router.refresh();
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !busy) submit();
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 40))}
        placeholder="Имя"
        className={inputClass}
      />

      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-tynysh-muted">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(cleanHandle(e.target.value))}
            placeholder="юзернейм, например kai_07"
            className={inputClass}
          />
        </div>
        {handle.length > 0 && !handleOk && (
          <p className="mt-1 px-1 text-xs text-alarm-text">
            От 3 до 32 символов: латиница, цифры, «_» и «.».
          </p>
        )}
      </div>

      <div>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Год рождения, например 2009"
          inputMode="numeric"
          className={inputClass}
        />
        {yearError && <p className="mt-1 px-1 text-xs text-alarm-text">{yearError}</p>}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || busy}
        className="w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40"
      >
        {busy ? "Сохраняем…" : "Начать общение"}
      </button>

      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}

      <p className="text-xs text-tynysh-muted">
        Tynysh — с {MIN_AGE} лет. Год рождения нужен только для этой проверки.
      </p>
    </form>
  );
}
