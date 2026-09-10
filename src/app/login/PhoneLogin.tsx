"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorToRussian } from "@/lib/errors";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400";
const buttonClass =
  "w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40";

export function PhoneLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // таймер «можно запросить код заново»
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
    });
    setBusy(false);

    if (error) {
      setError(authErrorToRussian(error.message));
      return;
    }
    setStep("code");
    setCooldown(60);
  }

  async function verifyCode() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: code,
      type: "sms",
    });

    if (error) {
      setBusy(false);
      setError(authErrorToRussian(error.message));
      return;
    }

    // Главная страница сама решит: заводить профиль или сразу в чаты.
    router.replace("/");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (isValidPhone(phone) && !busy) sendCode();
        }}
      >
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 7__ ___ __ __"
          inputMode="tel"
          autoComplete="tel"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!isValidPhone(phone) || busy}
          className={buttonClass}
        >
          {busy ? "Отправляем…" : "Получить код"}
        </button>
        {error && <ErrorBox text={error} />}
        <p className="text-xs text-tynysh-muted">
          Пришлём SMS с кодом. Номер никому не показывается — другие видят только
          твой @юзернейм.
        </p>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length >= 4 && !busy) verifyCode();
      }}
    >
      <p className="text-sm text-tynysh-muted">
        Код отправлен на {formatPhone(phone)}.
      </p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Код из SMS"
        inputMode="numeric"
        autoComplete="one-time-code"
        className={`${inputClass} text-center text-xl tracking-[0.5em]`}
      />
      <button type="submit" disabled={code.length < 4 || busy} className={buttonClass}>
        {busy ? "Проверяем…" : "Подтвердить"}
      </button>
      {error && <ErrorBox text={error} />}

      <div className="flex items-center justify-between pt-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setCode("");
            setError("");
          }}
          className="text-tynysh-muted underline"
        >
          Изменить номер
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || busy}
          onClick={sendCode}
          className="font-bold text-tynysh disabled:opacity-40"
        >
          {cooldown > 0 ? `Новый код через ${cooldown} сек` : "Прислать код заново"}
        </button>
      </div>
    </form>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{text}</div>
  );
}
