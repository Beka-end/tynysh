/**
 * Собирает логотип Tynysh в PNG. Запуск: node scripts/make-logo.mjs
 *
 * Надпись — это шрифт Nunito ExtraBold цветом #2E6FA8, ровно тот же, что
 * стоит в шапке сайта. Отдельного нарисованного логотипа у Tynysh нет
 * и не нужно: название, набранное фирменным шрифтом, и есть знак.
 *
 * Варианты сделаны под разные фоны: на светлом — синяя надпись, на тёмном
 * или на фото — белая. Третий, тёмно-синий, для чёрно-белой печати.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "brand");

const VARIANTS = [
  { file: "wordmark-blue.png", cls: "blue", about: "синяя надпись, прозрачный фон" },
  { file: "wordmark-white.png", cls: "white", about: "белая надпись, прозрачный фон" },
  { file: "wordmark-dark.png", cls: "dark", about: "тёмная надпись для печати" },
  { file: "wordmark-on-blue.png", cls: "white onblue", about: "белая на синей плашке" },
];

const preinstalled = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch(
  fs.existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);

for (const variant of VARIANTS) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 520 },
  });
  await page.goto(`file://${path.join(dir, "wordmark.html")}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((cls) => {
    document.getElementById("target").className = `wrap ${cls}`;
  }, variant.cls);

  // omitBackground даёт прозрачный фон — надпись ляжет на что угодно
  await page.screenshot({
    path: path.join(dir, variant.file),
    omitBackground: !variant.cls.includes("onblue"),
  });
  console.log(`${variant.file} — ${variant.about}`);
  await page.close();
}

await browser.close();
