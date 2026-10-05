import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { ChangePassword } from "./ChangePassword";
import { PASSWORD_LOGIN_ENABLED } from "@/lib/login-config";

// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { me } = await requireProfile();

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-4 md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <Link href="/dos" className="text-sm text-tynysh-muted">
          К Досу
        </Link>
      </div>

      <h1 className="mb-4 text-xl font-extrabold">Настройки</h1>

      <div className="mb-5 rounded-2xl bg-tynysh-bg p-3 text-sm">
        <div className="font-bold">{me.name}</div>
        <div className="opacity-60">@{me.handle}</div>
      </div>

      {/* Пока вход по паролю выключен, задавать пароль бессмысленно:
          он никуда не подойдёт, а человек будет думать, что защитил аккаунт. */}
      {PASSWORD_LOGIN_ENABLED && <ChangePassword />}

      {/* Вход в админку жил на экране со списком чатов. Чатов нет — и владелец
          остался без единственной двери к оплатам и жалобам. Настройки есть
          всегда, поэтому дверь теперь здесь. */}
      {(me as { is_admin?: boolean }).is_admin && (
        <Link
          href="/admin"
          className="mb-5 block rounded-xl bg-tynysh-soft px-3 py-2.5 text-sm font-bold text-tynysh"
        >
          Админка — оплаты, жалобы, цифры
        </Link>
      )}

      <div className="mt-8 space-y-2 text-sm">
        <Link href="/plus" className="block text-tynysh underline">
          Дос Plus
        </Link>
        <Link href="/install" className="block text-tynysh underline">
          Поставить на телефон
        </Link>
        <Link href="/terms" className="block text-tynysh-muted underline">
          Пользовательское соглашение
        </Link>
        <Link href="/privacy" className="block text-tynysh-muted underline">
          Политика конфиденциальности
        </Link>
      </div>

      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="w-full rounded-xl bg-alarm py-3 font-bold text-alarm-text"
        >
          Выйти из аккаунта
        </button>
      </form>

      <p className="mt-3 text-xs leading-relaxed text-tynysh-muted">
        Выйти можно спокойно: вход в Tynysh идёт по коду из письма, пароля нет
        и забыть его нельзя. Чтобы вернуться, просто запроси новый код на свою
        почту.
      </p>
    </main>
  );
}
