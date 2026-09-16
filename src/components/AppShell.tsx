import Link from "next/link";
import { Logo } from "./Logo";
import { LiveNotifications } from "./LiveNotifications";
import { InstallCard } from "./Pwa";

const TABS = [
  { href: "/chats", label: "Чаты" },
  { href: "/contacts", label: "Контакты" },
  { href: "/groups", label: "Группы" },
];

/** Общая рамка внутренних экранов: шапка, вкладки и подпись с телефонами помощи. */
export function AppShell({
  meId,
  handle,
  active,
  children,
}: {
  meId: string;
  handle: string;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <header className="flex items-center justify-between px-4 py-4">
        <Logo />
        <Link
          href="/settings"
          title="Настройки"
          className="rounded-full px-2 py-1 text-sm text-tynysh-muted hover:bg-tynysh-soft"
        >
          @{handle} ⚙
        </Link>
      </header>

      <nav className="mx-4 mb-3 flex rounded-xl bg-tynysh-soft p-1 text-sm font-bold">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.href === active
                ? "flex-1 rounded-lg bg-white py-1.5 text-center text-tynysh shadow-sm"
                : "flex-1 py-1.5 text-center opacity-60"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <LiveNotifications meId={meId} refreshList withButton />
      <InstallCard />

      <div className="flex-1 px-2 pb-4">{children}</div>

      <p className="px-5 pb-2 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b> (линия доверия, бесплатно,
        круглосуточно) или <b>112</b>, если опасность прямо сейчас.
      </p>
      <p className="px-5 pb-5 text-xs text-[#8A85A3]">
        <Link href="/terms" className="underline">
          Соглашение
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          Конфиденциальность
        </Link>
      </p>
    </div>
  );
}
