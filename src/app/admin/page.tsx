import { notFound } from "next/navigation";
import Link from "next/link";
import { guardProfile, requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { AdminPanel, type AdminOrder, type AdminReport } from "./AdminPanel";
import {
  DOS_COST_PER_MESSAGE,
  DOS_HISTORY_LIMIT,
  DOS_HISTORY_LIMIT_PLUS,
  DOS_MODEL,
} from "@/lib/dos-config";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

type Stats = {
  users_total: number;
  users_week: number;
  chat_senders_week: number;
  chat_messages_week: number;
  dos_users: number;
  dos_returned: number;
  dos_messages_week: number;
  pack_finished: number;
  plus_active: number;
  mood_users_week: number;
  reports_new: number;
};

/** Группа цифр: заголовок и плитки. Текстов сообщений здесь нет и не будет. */
function Group({
  title,
  hint,
  items,
}: {
  title: string;
  hint?: string;
  items: [string, number][];
}) {
  return (
    <div className="rounded-xl border border-violet-100 p-3">
      <div className="text-sm font-bold">{title}</div>
      {hint && <div className="mb-2 text-xs text-tynysh-muted">{hint}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-tynysh-bg px-2.5 py-2">
            <div className="text-xl font-extrabold leading-none">{value}</div>
            <div className="mt-1 text-[11px] leading-tight text-tynysh-muted">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const [{ data: orders }, { data: reports }, { data: settings }, { data: statRows }] =
    await Promise.all([
      supabase.rpc("admin_orders"),
      supabase.rpc("admin_reports"),
      supabase.from("app_settings").select("key, value"),
      supabase.rpc("admin_stats"),
    ]);

  const stats = (Array.isArray(statRows) ? statRows[0] : statRows) as Stats | null;

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

      {stats && (
        <div className="mb-4 space-y-3">
          <Group
            title="Люди"
            items={[
              ["Всего", stats.users_total],
              ["Пришли за неделю", stats.users_week],
              ["Активных Plus", stats.plus_active],
            ]}
          />
          <Group
            title="Переписываются ли друг с другом"
            hint="Главный вопрос: переехал ли живой круг общения"
            items={[
              ["Писали кому-то за неделю", stats.chat_senders_week],
              ["Сообщений за неделю", stats.chat_messages_week],
            ]}
          />
          <Group
            title="Дос"
            hint={`За неделю ≈ ${Math.round(stats.dos_messages_week * DOS_COST_PER_MESSAGE)} ₸ расхода (прикидка, точное — в консоли Anthropic)`}
            items={[
              ["Писали хотя бы раз", stats.dos_users],
              ["Вернулись второй день", stats.dos_returned],
              ["Выбрали весь пакет", stats.pack_finished],
              ["Сообщений за неделю", stats.dos_messages_week],
              ["Отметили настроение", stats.mood_users_week],
            ]}
          />
          {stats.reports_new > 0 && (
            <div className="rounded-xl bg-alarm px-3 py-2 text-sm font-bold text-alarm-text">
              Новых жалоб: {stats.reports_new} — посмотри вкладку «Жалобы»
            </div>
          )}
        </div>
      )}

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
