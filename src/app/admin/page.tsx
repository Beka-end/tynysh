import { notFound } from "next/navigation";
import Link from "next/link";
import { guardProfile, requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { AdminPanel, type AdminOrder, type AdminReport } from "./AdminPanel";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

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

  const [{ data: orders }, { data: reports }] = await Promise.all([
    supabase.rpc("admin_orders"),
    supabase.rpc("admin_reports"),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-4 md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <Link href="/chats" className="text-sm text-tynysh-muted">
          К чатам
        </Link>
      </div>

      <h1 className="mb-4 text-xl font-extrabold">Админка</h1>

      <AdminPanel
        orders={(orders ?? []) as AdminOrder[]}
        reports={(reports ?? []) as AdminReport[]}
      />
    </main>
  );
}
