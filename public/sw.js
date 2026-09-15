// Минимальный service worker: он нужен, чтобы телефон разрешил «установить» сайт.
// Нарочно НЕ кэшируем страницы и данные — иначе люди видели бы вчерашние сообщения.
// Кэшируем только иконки и показываем заглушку, если интернет пропал совсем.

const OFFLINE_HTML = `<!doctype html><html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Нет связи — Tynysh</title>
<body style="font-family:system-ui;background:#F6F3FF;color:#241F3B;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px">
<div><div style="font-size:28px;font-weight:800;color:#5B4BDB">tynysh</div>
<p>Нет интернета. Сообщения появятся, как только связь вернётся.</p>
<p style="font-size:13px;opacity:.7">Если тебе плохо прямо сейчас — позвони <b>150</b>,
это работает без интернета.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Страницы — всегда из сети. Без связи показываем заглушку.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );
  }
});
