import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Logo } from "./Logo";
import { Markdown } from "@/lib/markdown";
import { LEGAL_IS_DRAFT } from "@/lib/legal";

/**
 * Показывает документ из папки docs. Страница собирается заранее, при сборке
 * сайта — поэтому файл читается один раз и никого не задерживает.
 */
export function LegalPage({ file }: { file: string }) {
  const text = fs.readFileSync(path.join(process.cwd(), "docs", file), "utf8");

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white p-5 md:my-4 md:rounded-3xl md:shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/" className="text-sm text-tynysh-muted">
          На главную
        </Link>
      </div>

      {LEGAL_IS_DRAFT && (
        <div className="mb-4 rounded-xl bg-dos px-3 py-2.5 text-sm leading-relaxed text-dos-text">
          <b>Черновик.</b> Документ ещё не проверен юристом и будет уточнён до
          запуска. Пока Tynysh работает в режиме проверки с небольшой группой людей.
        </div>
      )}

      <Markdown text={text} />

      <p className="mt-8 border-t border-violet-100 pt-4 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b> (линия доверия, бесплатно,
        круглосуточно) или <b>112</b>, если опасность прямо сейчас.
      </p>
    </main>
  );
}
