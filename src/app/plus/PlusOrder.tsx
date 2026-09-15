"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbErrorToRussian } from "@/lib/errors";

type Plan = "month" | "year";

/**
 * Оплата пока ручная: человек платит по ссылке Kaspi и присылает скрин,
 * админ включает Plus кнопкой. Автосписание — позже, когда будет что списывать.
 */
export function PlusOrder({
  userId,
  priceMonth,
  priceYear,
  kaspiLink,
  support,
  alreadyPlus,
  plusUntil,
  hadPending,
}: {
  userId: string;
  priceMonth: number;
  priceYear: number;
  kaspiLink: string;
  support: string;
  alreadyPlus: boolean;
  plusUntil: string | null;
  hadPending: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("month");
  const [sent, setSent] = useState(hadPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (alreadyPlus) {
    return (
      <div className="rounded-2xl bg-[#E6F7EF] p-4 text-sm">
        <div className="font-bold">Дос Plus активен</div>
        <div className="opacity-70">
          {plusUntil ? `Действует до ${plusUntil}` : "Без ограничения по сроку"}
        </div>
      </div>
    );
  }

  async function order() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: orderError } = await supabase.from("plus_orders").insert({
      user_id: userId,
      plan,
      amount: plan === "month" ? priceMonth : priceYear,
    });
    setBusy(false);
    if (orderError) {
      setError(dbErrorToRussian(orderError.code, orderError.message));
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-dos p-4 text-sm leading-relaxed text-dos-text">
          <div className="mb-1 text-base font-bold">Заявка принята. Осталось два шага</div>
          <div className="mt-2">
            <b>1.</b> Оплати по ссылке Kaspi.
          </div>
          <div>
            <b>2.</b> Пришли скриншот оплаты{support ? ` в ${support}` : " в поддержку"} —
            включим Plus в течение 10 минут.
          </div>
        </div>

        {kaspiLink ? (
          <a
            href={kaspiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-tynysh py-3 text-center font-extrabold text-white"
          >
            Открыть оплату Kaspi
          </a>
        ) : (
          <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
            Ссылка Kaspi ещё не настроена. Владельцу: Supabase → Table Editor →
            <b> app_texts</b> → строка <b>kaspi_link</b>.
          </div>
        )}

        <button
          type="button"
          onClick={() => setSent(false)}
          className="w-full py-2 text-sm text-tynysh-muted"
        >
          Вернуться к тарифам
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(
          [
            ["month", priceMonth, "в месяц"],
            ["year", priceYear, "в год · −33%"],
          ] as [Plan, number, string][]
        ).map(([key, price, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPlan(key)}
            className={`flex-1 rounded-2xl p-3 text-left ${
              plan === key ? "border-2 border-tynysh" : "border border-violet-100"
            }`}
          >
            <div className="font-extrabold">{price.toLocaleString("ru-RU")} ₸</div>
            <div className="text-xs opacity-60">{label}</div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={order}
        disabled={busy}
        className="w-full rounded-xl bg-tynysh py-3 font-extrabold text-white disabled:opacity-40"
      >
        {busy ? "Секунду…" : "Оплатить через Kaspi"}
      </button>

      {error && (
        <div className="rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">{error}</div>
      )}

      <p className="text-xs leading-relaxed text-tynysh-muted">
        Оплата пока ручная: платишь по ссылке Kaspi и присылаешь скриншот. Никаких
        автосписаний — подписка не продлится сама, пока ты не заплатишь снова.
      </p>
    </div>
  );
}
