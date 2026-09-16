"use client";

import { useEffect, useState } from "react";
import { OtpLogin, type Channel } from "./OtpLogin";
import { PasswordLogin } from "./PasswordLogin";
import { PASSWORD_LOGIN_ENABLED, PHONE_LOGIN_ENABLED } from "@/lib/login-config";

const TABS: [Channel, string][] = [
  ["phone", "По телефону"],
  ["email", "По почте"],
];

export function LoginTabs() {
  const [channel, setChannel] = useState<Channel>(
    PHONE_LOGIN_ENABLED ? "phone" : "email",
  );
  const [showPhone, setShowPhone] = useState(PHONE_LOGIN_ENABLED);
  const [byCode, setByCode] = useState(!PASSWORD_LOGIN_ENABLED);

  // Служебный вход для владельца: /login?phone=1 — в его тестовые аккаунты,
  // заведённые по номеру. Обычные люди про этот адрес не знают.
  useEffect(() => {
    if (PHONE_LOGIN_ENABLED) return;
    if (new URLSearchParams(window.location.search).get("phone") === "1") {
      setShowPhone(true);
    }
  }, []);

  if (!showPhone) {
    return (
      <div>
        {byCode ? (
          <>
            <OtpLogin channel="email" />
            {PASSWORD_LOGIN_ENABLED && (
              <button
                type="button"
                onClick={() => setByCode(false)}
                className="mt-2 w-full py-1 text-sm text-tynysh-muted underline"
              >
                Вернуться ко входу по паролю
              </button>
            )}
          </>
        ) : (
          <PasswordLogin onWantCode={() => setByCode(true)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex rounded-xl bg-tynysh-soft p-1 text-sm font-bold">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setChannel(key)}
            className={`flex-1 rounded-lg py-2 transition ${
              channel === key ? "bg-white text-tynysh shadow-sm" : "opacity-60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <OtpLogin channel={channel} />
    </div>
  );
}
