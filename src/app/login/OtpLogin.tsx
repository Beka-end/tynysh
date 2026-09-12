"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorToRussian } from "@/lib/errors";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";
import { isValidEmail, normalizeEmail } from "@/lib/email";

/**
 * Вход по одноразовому коду. Два способа устроены одинаково:
 * сначала присылаем код на телефон или на почту, потом проверяем его.
 */
export type Channel = "phone" | "email";

const inputClass =
  "w-full rounded-xl border border-violet-100 bg-white px-4 py-3 outline-none focus:border-violet-400";
const buttonClass =
  "w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40";

export function OtpLogin({ channel }: { channel: Channel }) {
  const router = useRouter();
  const isPhone = channel === "phone";

  const [step, setStep] = useState<"contact" | "code">("contact");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // при переключении вкладки начинаем с чистого листа
  useEffect(() => {
    setStep("contact");
    setContact("");
    setCode("");
    setError("");
  }, [channel]);

  // таймер «можно запросить код заново»
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const contactOk = isPhone ? isValidPhone(contact) : isValidEmail(contact);
  const minCodeLength = isPhone ? 4 : 6;

  async function sendCode() {
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error } = isPhone
      ? await supabase.auth.signInWithOtp({ phone: normalizePhone(contact) })
      : await supabase.auth.signInWithOtp({
          email: normalizeEmail(contact),
          // чтобы ссылка из письма вела на этот сайт, а не на адрес по умолчанию
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    const { error } = isPhone
      ? await supabase.auth.verifyOtp({
          phone: normalizePhone(contact),
          token: code,
          type: "sms",
        })
      : await supabase.auth.verifyOtp({
          email: normalizeEmail(contact),
          token: code,
          type: "email",
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

  if (step === "contact") {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (contactOk && !busy) sendCode();
        }}
      >
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={isPhone ? "+7 7__ ___ __ __" : "почта@example.com"}
          inputMode={isPhone ? "tel" : "email"}
          autoComplete={isPhone ? "tel" : "email"}
          className={inputClass}
        />
        <button type="submit" disabled={!contactOk || busy} className={buttonClass}>
          {busy ? "Отправляем…" : "Получить код"}
        </button>
        {error && <ErrorBox text={error} />}
        <p className="text-xs text-tynysh-muted">
          {isPhone
            ? "Пришлём SMS с кодом. Номер никому не показывается — другие видят только твой @юзернейм."
            : "Пришлём письмо с кодом. Почта никому не показывается — другие видят только твой @юзернейм."}
        </p>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length >= minCodeLength && !busy) verifyCode();
      }}
    >
      <p className="text-sm text-tynysh-muted">
        {isPhone ? (
          <>Код отправлен на {formatPhone(contact)}.</>
        ) : (
          <>
            Письмо отправлено на {normalizeEmail(contact)}. Открой его и нажми на
            ссылку — этого достаточно, вход произойдёт сам. Проверь и папку «Спам».
          </>
        )}
      </p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder={isPhone ? "Код из SMS" : "Код из письма"}
        inputMode="numeric"
        autoComplete="one-time-code"
        className={`${inputClass} text-center text-xl tracking-[0.5em]`}
      />
      <button
        type="submit"
        disabled={code.length < minCodeLength || busy}
        className={buttonClass}
      >
        {busy ? "Проверяем…" : "Подтвердить"}
      </button>
      {error && <ErrorBox text={error} />}

      <div className="flex items-center justify-between pt-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("contact");
            setCode("");
            setError("");
          }}
          className="text-tynysh-muted underline"
        >
          {isPhone ? "Изменить номер" : "Изменить почту"}
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

      {!isPhone && (
        <p className="text-xs text-tynysh-muted">
          Если в письме есть шестизначный код — можно ввести его сюда. Если только
          ссылка — просто нажми на неё в письме.
        </p>
      )}
    </form>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{text}</div>
  );
}
