"use client";

import { useState } from "react";
import { OtpLogin, type Channel } from "./OtpLogin";

const TABS: [Channel, string][] = [
  ["phone", "По телефону"],
  ["email", "По почте"],
];

export function LoginTabs() {
  const [channel, setChannel] = useState<Channel>("phone");

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
