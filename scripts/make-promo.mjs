/**
 * Перерисовывает промо-картинки из HTML в promo/. Запуск:
 *   node scripts/make-promo.mjs
 *
 * Зачем скриптом, а не руками в редакторе: на картинках написаны цена,
 * размер бесплатного пакета и обещания про продукт. Когда они меняются
 * в коде, картинки обязаны меняться вместе — иначе ты показываешь людям
 * то, чего уже нет. Правишь текст в promo/*.html и запускаешь это.
 *
 * Скрипт проверяет, что содержимое влезло в формат: обрезанный низ
 * на картинке заметить легко, а в спешке — легко и не заметить.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "promo");

const JOBS = [
  { name: "post", width: 1080, height: 1080, scale: 1, about: "квадрат для ленты" },
  { name: "story", width: 1080, height: 1920, scale: 1, about: "сторис" },
  { name: "poster", width: 794, height: 1123, scale: 2, about: "A4 для печати" },
];

// На машинах, где Chromium уже лежит рядом (например, в готовом окружении),
// берём его: иначе playwright требует скачивать свой и падает.
const preinstalled = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  fs.existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
let broken = false;

for (const job of JOBS) {
  const page = await browser.newPage({
    viewport: { width: job.width, height: job.height },
    deviceScaleFactor: job.scale,
  });
  await page.goto(`file://${path.join(dir, job.name)}.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const fit = await page.evaluate(() => {
    const el = document.body.firstElementChild;
    return { scroll: el.scrollHeight, box: el.clientHeight };
  });
  await page.screenshot({ path: path.join(dir, `${job.name}.png`) });
  await page.close();

  if (fit.scroll > fit.box) {
    broken = true;
    console.error(`${job.name}: содержимое выходит за край на ${fit.scroll - fit.box}px — низ обрежется`);
  } else {
    console.log(`${job.name} (${job.about}) — готово`);
  }
}

await browser.close();
if (broken) process.exit(1);
