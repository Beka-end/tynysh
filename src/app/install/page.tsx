import Link from "next/link";
import { Logo } from "@/components/Logo";
import { InstallSteps } from "./InstallSteps";

export const metadata = {
  title: "Установить Tynysh на телефон",
  description: "Tynysh ставится на телефон без App Store и Google Play — за два нажатия.",
};

export default function InstallPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-white p-5 md:my-4 md:rounded-3xl md:shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/chats" className="text-sm text-tynysh-muted">
          К чатам
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-extrabold">Поставить на телефон</h1>
      <p className="mb-5 text-sm leading-relaxed text-tynysh-muted">
        Tynysh не нужно скачивать из App Store или Google Play — его туда и не
        выкладывали. Сайт ставится на телефон сам, за два нажатия: появится иконка
        на экране, приложение откроется на весь экран, и заработают уведомления.
      </p>

      <InstallSteps />

      <p className="mt-8 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b> (линия доверия, бесплатно,
        круглосуточно) или <b>112</b>, если опасность прямо сейчас.
      </p>
    </main>
  );
}
