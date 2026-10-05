"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dbErrorToRussian } from "@/lib/errors";

/**
 * Оплата пока ручная: человек платит по ссылке Kaspi и присылает скрин,
 * админ включает Plus кнопкой. Автосписание — позже, когда будет что списывать.
 *
 * Тариф один — месяц. Годовой убран: при потолке в 10 сообщений в день он
 * выходил в минус (7 900 ₸ — это 658 ₸ в месяц против 978 ₸ предельного
 * расхода), а год вперёд за непроверенный продукт — плохая сделка для обеих
 * сторон. Вернём, когда станет видно, сколько люди пишут на самом деле.
 */
export function PlusOrder({
  userId,
  handle,
  priceMonth,
  kaspiLink,
  support,
  alreadyPlus,
  plusUntil,
  hadPending,
}: {
  userId: string;
  handle: string;
  priceMonth: number;
  kaspiLink: string;
  support: string;
  alreadyPlus: boolean;
  plusUntil: string | null;
  hadPending: boolean;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(hadPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (alreadyPlus) {
    return (
      <div className="rounded-2xl bg-calm p-4 text-sm">
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
      plan: "month",
      amount: priceMonth,
    });
    setBusy(false);
    if (orderError) {
      setError(dbErrorToRussian(orderError.code, orderError.message));
      return;
    }
    setSent(true);
    router.refresh();
  }

  // Сумму человек вводит в Kaspi руками, поэтому её надо держать у него
  // перед глазами на самом экране оплаты, а не только в списке тарифов.
  const amount = priceMonth;

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-tynysh-soft p-4 text-sm leading-relaxed text-tynysh-dark">
          <div className="mb-1 text-base font-bold">Заявка принята. Осталось два шага</div>
          <div className="mt-2">
            <b>1.</b> Оплати по ссылке Kaspi. Сумму вводишь сам — впиши ровно{" "}
            <b>{amount.toLocaleString("ru-RU")} ₸</b>.
          </div>
          <div className="mt-1">
            <b>2.</b> Пришли скриншот оплаты{support ? ` в ${support}` : " в поддержку"} и
            обязательно подпиши свой юзернейм: <b>@{handle}</b>.
          </div>
        </div>

        {/* Чек приходит от «Бекарыс А.», а в заявках десять человек — без
            юзернейма не понять, кому включать. Поэтому просим подписать
            и показываем готовый текст, чтобы его осталось только скопировать. */}
        <div className="rounded-xl border border-tynysh-line bg-white px-3 py-2.5 text-sm">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-tynysh-muted">
            Отправь вместе со скриншотом
          </div>
          <div className="font-bold">
            Оплатил Дос Plus, {amount.toLocaleString("ru-RU")} ₸ — @{handle}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-tynysh-muted">
            Без юзернейма мы не поймём, кому включать: в чеке будет только твоё
            имя, а людей с таким именем может быть несколько.
          </p>
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
      <div className="rounded-2xl border-2 border-tynysh p-4">
        <div className="text-2xl font-extrabold">
          {priceMonth.toLocaleString("ru-RU")} ₸
        </div>
        <div className="text-xs opacity-60">в месяц · отменить можно когда угодно</div>
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
