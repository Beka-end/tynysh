import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";


type ChatRow = {
  id: string;
  type: "dm" | "group";
  title: string | null;
};

export default async function ChatsPage() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, handle")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/welcome");

  // Правила безопасности базы (RLS) сами оставят только те чаты, где я участник.
  const { data: chats } = await supabase
    .from("chats")
    .select("id, type, title")
    .order("created_at", { ascending: false });

  const list = (chats ?? []) as ChatRow[];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <header className="flex items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="text-sm text-tynysh-muted">@{profile.handle}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Выйти"
              className="rounded-full px-2 py-1 text-sm text-tynysh-muted hover:bg-tynysh-soft"
            >
              ✕
            </button>
          </form>
        </div>
      </header>

      <nav className="mx-4 mb-3 flex rounded-xl bg-tynysh-soft p-1 text-sm font-bold">
        <span className="flex-1 rounded-lg bg-white py-1.5 text-center text-tynysh shadow-sm">
          Чаты
        </span>
        <span className="flex-1 py-1.5 text-center opacity-40">Контакты</span>
        <span className="flex-1 py-1.5 text-center opacity-40">Группы</span>
      </nav>

      <div className="flex-1 px-2 pb-4">
        {list.length === 0 ? (
          <EmptyChats name={profile.name} />
        ) : (
          <ul>
            {list.map((chat) => (
              <li key={chat.id}>
                <div className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left">
                  <Avatar name={chat.title ?? "Чат"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {chat.type === "group" && <span className="opacity-40">#</span>}
                      {chat.title ?? "Чат"}
                    </div>
                    <div className="truncate text-xs opacity-60">Напиши первым</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="px-5 pb-5 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b> (линия доверия, бесплатно,
        круглосуточно) или <b>112</b>, если опасность прямо сейчас.
      </p>
    </div>
  );
}

function EmptyChats({ name }: { name: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mb-3 text-5xl">💬</div>
      <div className="mb-1 text-lg font-extrabold">Привет, {name}!</div>
      <p className="text-sm leading-relaxed text-tynysh-muted">
        Чатов пока нет. Поиск по @юзернейму, личные чаты и группы появятся на
        следующем этапе — тогда список начнёт заполняться.
      </p>
    </div>
  );
}
