"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => void };
type Platform = "ios" | "android" | "desktop";

/**
 * Показывает шаги установки под то устройство, с которого открыли страницу.
 * Кнопку «Установить» даёт только Android-браузер и только когда сам решит,
 * что сайт готов, — поэтому шаги руками нужны всегда, а не как запасной вариант.
 */
export function InstallSteps() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(
      /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "desktop",
    );
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true,
    );

    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <div className="rounded-2xl bg-[#E6F7EF] p-4 text-sm">
        <div className="font-bold">Уже установлено</div>
        <div className="opacity-80">Ты открыл Tynysh как приложение — всё на месте.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prompt && (
        <button
          type="button"
          onClick={() => prompt.prompt()}
          className="w-full rounded-xl bg-tynysh py-3 font-extrabold text-white"
        >
          Установить
        </button>
      )}

      <Card active={platform === "ios"} title="iPhone и iPad">
        <ol className="ml-4 list-decimal space-y-1">
          <li>Открой Tynysh в <b>Safari</b> (в Chrome на айфоне кнопки не будет).</li>
          <li>Нажми кнопку «Поделиться» — квадрат со стрелкой вверх, внизу экрана.</li>
          <li>Пролистай список вниз → <b>«На экран «Домой»»</b> → «Добавить».</li>
        </ol>
        <p className="mt-2 text-xs text-tynysh-muted">
          На айфоне кнопки «Установить» не существует — так у Apple. Зато после
          этого заработают уведомления о сообщениях.
        </p>
      </Card>

      <Card active={platform === "android"} title="Android">
        <ol className="ml-4 list-decimal space-y-1">
          <li>Открой Tynysh в <b>Chrome</b>.</li>
          <li>Меню браузера — три точки справа вверху.</li>
          <li>
            <b>«Установить приложение»</b> или «Добавить на главный экран».
          </li>
        </ol>
        <p className="mt-2 text-xs text-tynysh-muted">
          Иногда Chrome предлагает это сам — тогда вверху этой страницы появится
          кнопка «Установить».
        </p>
      </Card>

      <Card active={platform === "desktop"} title="Компьютер">
        <ol className="ml-4 list-decimal space-y-1">
          <li>Chrome или Edge: значок с плюсом в правой части адресной строки.</li>
          <li>Или меню браузера → «Установить Tynysh».</li>
        </ol>
        <p className="mt-2 text-xs text-tynysh-muted">
          В Safari и Firefox на компьютере установки нет — сайт просто работает
          в браузере.
        </p>
      </Card>
    </div>
  );
}

function Card({
  active,
  title,
  children,
}: {
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-sm leading-relaxed ${
        active ? "bg-tynysh-soft" : "border border-violet-100"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 font-bold">
        {title}
        {active && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-tynysh">
            у тебя это
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
