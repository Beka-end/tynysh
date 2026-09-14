/**
 * Заглушки, которые показываются, пока страница грузится с сервера.
 * Их задача — чтобы экран отвечал на нажатие мгновенно, а не белым пятном.
 */
import { Logo } from "./Logo";

function Line({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 rounded bg-slate-100 ${w}`} />;
}

function Row() {
  return (
    <div className="flex items-center gap-3 p-2.5">
      <div className="h-11 w-11 shrink-0 rounded-full bg-slate-100" />
      <div className="flex-1 space-y-2">
        <Line w="w-1/3" />
        <Line w="w-2/3" />
      </div>
    </div>
  );
}

/** Каркас вкладок (Чаты / Контакты / Группы). */
export function ShellSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md animate-pulse flex-col bg-white md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:shadow-sm">
      <header className="flex items-center justify-between px-4 py-4">
        <Logo />
        <div className="h-4 w-20 rounded bg-slate-100" />
      </header>
      <div className="mx-4 mb-3 h-9 rounded-xl bg-tynysh-soft" />
      <div className="flex-1 px-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Row key={i} />
        ))}
      </div>
    </div>
  );
}

/** Каркас окна переписки. */
export function ChatSkeleton() {
  return (
    <div className="mx-auto flex h-dvh max-w-md animate-pulse flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-violet-100 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <Line w="w-1/3" />
          <Line w="w-1/4" />
        </div>
      </header>
      <div className="flex-1 space-y-3 bg-tynysh-bg p-4">
        <div className="h-9 w-2/3 rounded-2xl bg-white" />
        <div className="ml-auto h-9 w-1/2 rounded-2xl bg-violet-100" />
        <div className="h-9 w-3/5 rounded-2xl bg-white" />
      </div>
      <div className="border-t border-violet-100 p-3">
        <div className="h-10 rounded-full bg-tynysh-bg" />
      </div>
    </div>
  );
}
