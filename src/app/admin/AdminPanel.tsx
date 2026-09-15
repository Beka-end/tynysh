"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rpcErrorToRussian } from "@/lib/errors";
import { formatListTime } from "@/lib/chat";

export type AdminOrder = {
  id: string;
  user_id: string;
  handle: string;
  name: string;
  plan: "month" | "year";
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  is_plus: boolean;
  plus_until: string | null;
};

export type AdminReport = {
  id: string;
  target_id: string;
  target_handle: string;
  target_name: string;
  target_banned: boolean;
  reporter_handle: string | null;
  reason: string | null;
  status: "new" | "reviewed" | "banned";
  created_at: string;
};

export function AdminPanel({
  orders,
  reports,
}: {
  orders: AdminOrder[];
  reports: AdminReport[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "reports">("orders");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, fn: string, args: Record<string, unknown>) {
    setBusy(key);
    setError("");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(fn, args);
    setBusy("");
    if (rpcError) {
      setError(rpcErrorToRussian(rpcError.code, rpcError.message));
      return;
    }
    router.refresh();
  }

  const waiting = orders.filter((o) => o.status === "pending").length;
  const fresh = reports.filter((r) => r.status === "new").length;

  return (
    <div>
      <div className="mb-3 flex rounded-xl bg-tynysh-soft p-1 text-sm font-bold">
        {(
          [
            ["orders", `Оплаты${waiting ? ` · ${waiting}` : ""}`],
            ["reports", `Жалобы${fresh ? ` · ${fresh}` : ""}`],
          ] as ["orders" | "reports", string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-1.5 ${
              tab === key ? "bg-white text-tynysh shadow-sm" : "opacity-60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-alarm px-3 py-2 text-sm text-alarm-text">
          {error}
        </div>
      )}

      {tab === "orders" &&
        (orders.length === 0 ? (
          <p className="p-4 text-sm text-tynysh-muted">Заявок на оплату пока нет.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="mb-2 rounded-xl border border-violet-100 p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-bold">
                  {order.name} <span className="font-medium opacity-50">@{order.handle}</span>
                </div>
                <span className="text-[11px] opacity-40">
                  {formatListTime(order.created_at)}
                </span>
              </div>
              <div className="mt-0.5 text-xs opacity-70">
                {order.plan === "year" ? "Год" : "Месяц"} · {order.amount.toLocaleString("ru-RU")} ₸ ·{" "}
                {order.status === "pending"
                  ? "ждёт оплаты"
                  : order.status === "paid"
                    ? "оплачено"
                    : "отменено"}
                {order.is_plus && ` · Plus до ${order.plus_until ?? "—"}`}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === order.id + "m"}
                  onClick={() =>
                    run(order.id + "m", "admin_set_plus", {
                      target: order.user_id,
                      months: 1,
                    })
                  }
                  className="rounded-lg bg-tynysh px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  Включить на месяц
                </button>
                <button
                  type="button"
                  disabled={busy === order.id + "y"}
                  onClick={() =>
                    run(order.id + "y", "admin_set_plus", {
                      target: order.user_id,
                      months: 12,
                    })
                  }
                  className="rounded-lg bg-tynysh-soft px-3 py-1.5 text-sm font-bold text-tynysh disabled:opacity-40"
                >
                  На год
                </button>
                {order.is_plus && (
                  <button
                    type="button"
                    disabled={busy === order.id + "s"}
                    onClick={() =>
                      run(order.id + "s", "admin_stop_plus", { target: order.user_id })
                    }
                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-alarm-text disabled:opacity-40"
                  >
                    Выключить
                  </button>
                )}
              </div>
            </div>
          ))
        ))}

      {tab === "reports" &&
        (reports.length === 0 ? (
          <p className="p-4 text-sm text-tynysh-muted">Жалоб нет. Это хорошая новость.</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="mb-2 rounded-xl border border-violet-100 p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-bold">
                  На {report.target_name}{" "}
                  <span className="font-medium opacity-50">@{report.target_handle}</span>
                </div>
                <span className="text-[11px] opacity-40">
                  {formatListTime(report.created_at)}
                </span>
              </div>
              <div className="mt-0.5 text-xs opacity-70">
                От @{report.reporter_handle ?? "—"} ·{" "}
                {report.status === "new"
                  ? "новая"
                  : report.status === "reviewed"
                    ? "проверена"
                    : "бан"}
                {report.target_banned && " · аккаунт забанен"}
              </div>
              {report.reason && (
                <p className="mt-2 rounded-lg bg-tynysh-bg px-2.5 py-2 text-sm">
                  {report.reason}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === report.id + "r"}
                  onClick={() =>
                    run(report.id + "r", "admin_review_report", {
                      report_id: report.id,
                      new_status: "reviewed",
                    })
                  }
                  className="rounded-lg bg-tynysh-soft px-3 py-1.5 text-sm font-bold text-tynysh disabled:opacity-40"
                >
                  Проверено
                </button>
                {report.target_banned ? (
                  <button
                    type="button"
                    disabled={busy === report.id + "u"}
                    onClick={() =>
                      run(report.id + "u", "admin_set_ban", {
                        target: report.target_id,
                        value: false,
                      })
                    }
                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-tynysh disabled:opacity-40"
                  >
                    Разбанить
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === report.id + "b"}
                    onClick={async () => {
                      if (!confirm(`Забанить @${report.target_handle}? Он не сможет никому писать.`))
                        return;
                      await run(report.id + "b", "admin_set_ban", {
                        target: report.target_id,
                        value: true,
                      });
                      await run(report.id + "b2", "admin_review_report", {
                        report_id: report.id,
                        new_status: "banned",
                      });
                    }}
                    className="rounded-lg bg-alarm px-3 py-1.5 text-sm font-bold text-alarm-text disabled:opacity-40"
                  >
                    Забанить
                  </button>
                )}
              </div>
            </div>
          ))
        ))}
    </div>
  );
}
