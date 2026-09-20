import Link from "next/link";
import { guardProfile, requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { PlusOrder } from "./PlusOrder";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

type Setting = { key: string; value: number };
type TextSetting = { key: string; value: string };

export default async function PlusPage() {
  const { supabase, userId } = await requireUser();

  const [{ data: profile }, { data: settings }, { data: texts }, { data: orders }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, handle, banned, is_plus, plus_until")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("app_settings").select("key, value"),
      supabase.from("app_texts").select("key, value"),
      supabase
        .from("plus_orders")
        .select("id, plan, amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  guardProfile(profile);

  const setting = (key: string, fallback: number) =>
    ((settings ?? []) as Setting[]).find((s) => s.key === key)?.value ?? fallback;
  const textOf = (key: string) =>
    ((texts ?? []) as TextSetting[]).find((t) => t.key === key)?.value ?? "";

  // Обещать «без лимита», когда потолок есть, нельзя: человек платит за одно,
  // а упирается в другое. Пишем ту цифру, которая на самом деле стоит в базе.
  const plusDaily = setting("dos_plus_daily", 10);
  const plusDailyLine =
    plusDaily > 0
      ? `✓ ${plusDaily} сообщений Досу каждый день — счёт обнуляется утром`
      : "✓ Разговоры с Досом без лимита";

  const full = profile as { is_plus?: boolean; plus_until?: string | null } | null;
  const pending = ((orders ?? []) as { status: string }[])[0]?.status === "pending";

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-5 md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <Link href="/dos" className="text-sm text-tynysh-muted">
          ✕
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-extrabold">Дос Plus на месяц</h1>
      <p className="mb-5 text-sm leading-relaxed text-tynysh-muted">
        Чаты и группы бесплатны всегда. Plus — это про разговоры с Досом.
      </p>

      <ul className="mb-6 space-y-1.5 text-sm">
        <li>{plusDailyLine}</li>
        <li>✓ Дос помнит разговоры намного дольше</li>
        <li>✓ Итог недели по дневнику настроения</li>
        <li>✓ Никакой рекламы — никогда</li>
      </ul>

      <p className="mb-6 text-xs leading-relaxed text-tynysh-muted">
        Дос — программа для поддержки, а не психолог и не врач. Он не ставит
        диагнозы и не назначает лечение. Если тяжело всерьёз — он подскажет,
        к кому обратиться.
      </p>

      <PlusOrder
        userId={userId}
        priceMonth={setting("plus_price_month", 990)}
        priceYear={setting("plus_price_year", 7900)}
        kaspiLink={textOf("kaspi_link")}
        support={textOf("support_contact")}
        alreadyPlus={Boolean(full?.is_plus)}
        plusUntil={full?.plus_until ?? null}
        hadPending={pending}
      />

      <p className="mt-6 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b>. Это бесплатно, круглосуточно
        и не требует никакой подписки.
      </p>
    </main>
  );
}
