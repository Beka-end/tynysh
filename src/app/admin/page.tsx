import { notFound } from "next/navigation";
import Link from "next/link";
import { guardProfile, requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { AdminPanel, type AdminOrder, type AdminReport } from "./AdminPanel";
import { DOS_HISTORY_LIMIT, DOS_HISTORY_LIMIT_PLUS, DOS_MODEL } from "@/lib/dos-config";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

function Row({ label, value, where }: { label: string; value: string; where: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="text-tynysh-muted">{label}</dt>
      <dd className="text-right">
        <b>{value}</b>
        <span className="ml-2 text-[11px] text-tynysh-muted">{where}</span>
      </dd>
    </div>
  );
}

export default async function AdminPage() {
  const { supabase, userId } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, handle, banned, is_admin")
    .eq("id", userId)
    .maybeSingle();
  guardProfile(profile);

  // Не админ — страницы просто «нет». Так мы не подсказываем, что она существует.
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) notFound();

  const [{ data: orders }, { data: reports }, { data: settings }] = await Promise.all([
    supabase.rpc("admin_orders"),
    supabase.rpc("admin_reports"),
    supabase.from("app_settings").select("key, value"),
  ]);

  const setting = (key: string) =>
    ((settings ?? []) as { key: string; value: number }[]).find((s) => s.key === key)
      ?.value;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-4 md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <Link href="/chats" className="text-sm text-tynysh-muted">
          К чатам
        </Link>
      </div>

      <h1 className="mb-4 text-xl font-extrabold">Админка</h1>

      <details className="mb-4 rounded-xl border border-violet-100 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-bold">Что сейчас настроено</summary>
        <dl className="mt-2 space-y-1.5">
          <Row label="Модель Доса" value={DOS_MODEL} where="в коде: src/lib/dos-config.ts" />
          <Row
            label="Бесплатный пакет"
            value={`${setting("dos_free_total") ?? "—"} сообщений всего`}
            where="app_settings → dos_free_total"
          />
          <Row
            label="Сверх пакета"
            value={
              setting("dos_free_daily")
                ? `${setting("dos_free_daily")} в день`
                : "не выдаётся"
            }
            where="app_settings → dos_free_daily"
          />
          <Row
            label="Потолок у Plus"
            value={
              setting("dos_plus_daily")
                ? `${setting("dos_plus_daily")} сообщений в день`
                : "без потолка"
            }
            where="app_settings → dos_plus_daily"
          />
          <Row
            label="Цена Plus"
            value={`${setting("plus_price_month") ?? "—"} ₸ месяц · ${setting("plus_price_year") ?? "—"} ₸ год`}
            where="app_settings → plus_price_month / plus_price_year"
          />
          <Row
            label="Память Доса"
            value={`${DOS_HISTORY_LIMIT} сообщений · ${DOS_HISTORY_LIMIT_PLUS} у Plus`}
            where="в коде: src/lib/dos-config.ts"
          />
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-tynysh-muted">
          Строки «app_settings» меняются прямо в Supabase → Table Editor, сайт
          пересобирать не нужно. Строки «в коде» меняет разработчик.
        </p>
      </details>

      <AdminPanel
        orders={(orders ?? []) as AdminOrder[]}
        reports={(reports ?? []) as AdminReport[]}
      />
    </main>
  );
}
