"use client";

import { useEffect, useState } from "react";

/** Подключает service worker — без него телефон не предложит «установить». */
export function PwaSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // не страшно: сайт работает и без установки
    });
  }, []);

  return null;
}

type InstallEvent = Event & { prompt: () => void };

/**
 * Карточка «поставь на телефон». На Android браузер сам даёт нам кнопку,
 * на iPhone кнопки нет — там показываем, что нажать руками.
 */
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Уже установлено — предлагать нечего.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    try {
      if (localStorage.getItem("tynysh-install-hidden") === "1") return;
    } catch {
      // приватный режим — ничего страшного
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    if (ios) setHidden(false);

    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallEvent);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function close() {
    setHidden(true);
    try {
      localStorage.setItem("tynysh-install-hidden", "1");
    } catch {
      // ничего
    }
  }

  if (hidden) return null;

  return (
    <div className="mx-2 mb-3 rounded-xl bg-tynysh-soft px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-bold text-tynysh">Поставь Tynysh на телефон</div>
          <div className="mt-0.5 text-xs leading-relaxed text-tynysh-muted">
            {isIos
              ? "Нажми «Поделиться» внизу браузера → «На экран «Домой»». Приложение откроется на весь экран, и заработают уведомления."
              : "Откроется на весь экран, как обычное приложение. Магазин не нужен."}
          </div>
          {!isIos && prompt && (
            <button
              type="button"
              onClick={() => {
                prompt.prompt();
                close();
              }}
              className="mt-2 rounded-lg bg-tynysh px-3 py-1.5 text-sm font-bold text-white"
            >
              Установить
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          title="Скрыть"
          className="px-1 text-tynysh-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
