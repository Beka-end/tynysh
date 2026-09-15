import { Logo } from "@/components/Logo";

export default function BannedPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo big />
        <div className="mt-6 rounded-2xl bg-alarm px-4 py-5 text-left text-sm leading-relaxed text-alarm-text">
          <div className="mb-1 text-base font-bold">Аккаунт заблокирован</div>
          Так бывает, когда на человека поступили жалобы и правила Tynysh были
          нарушены. Писать сообщения больше нельзя.
        </div>
        <p className="mt-4 text-xs leading-relaxed text-tynysh-muted">
          Если считаешь, что это ошибка — напиши в поддержку, разберёмся.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button type="submit" className="font-bold text-tynysh underline">
            Выйти
          </button>
        </form>
      </div>
    </main>
  );
}
