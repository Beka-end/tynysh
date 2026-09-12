import { Logo } from "@/components/Logo";
import { CallbackHandler } from "./CallbackHandler";

// Страница-перевалочный пункт: сюда ведёт ссылка из письма.
export const dynamic = "force-dynamic";

export default function CallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo big />
        <CallbackHandler />
      </div>
    </main>
  );
}
