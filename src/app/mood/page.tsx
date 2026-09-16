import Link from "next/link";
import { guardProfile, requireUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import type { MoodRow } from "@/lib/mood";
import { MoodDiary } from "./MoodDiary";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

export default async function MoodPage() {
  const { supabase, userId } = await requireUser();

  const [{ data: profile }, { data: moods }, { data: statusRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, handle, banned")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("moods")
      .select("day, value, note")
      .order("day", { ascending: false })
      .limit(30),
    supabase.rpc("dos_status"),
  ]);

  guardProfile(profile);
  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as
    | { plus_active: boolean }
    | null;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-4 md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <Link href="/dos" className="text-sm text-tynysh-muted">
          К Досу
        </Link>
      </div>

      <h1 className="mb-1 text-xl font-extrabold">Дневник настроения</h1>
      <p className="mb-4 text-sm leading-relaxed text-tynysh-muted">
        Отмечай день одним смайлом. Через неделю станет видно то, чего не замечаешь
        изнутри. Записи видишь только ты.
      </p>

      <MoodDiary
        userId={userId}
        rows={(moods ?? []) as MoodRow[]}
        plus={Boolean(status?.plus_active)}
      />
    </main>
  );
}
