import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Logo } from "./Logo";
import { Markdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Показывает документ из папки docs.
 *
 * В тексте документов стоит метка {{поддержка}} — вместо неё подставляется
 * контакт из app_texts. Так один и тот же контакт лежит в одном месте: меняешь
 * его в таблице, и он меняется разом в соглашении, в политике и на экране
 * оплаты. Вписать контакт прямо в текст документа было бы проще, но тогда при
 * смене телеграма пришлось бы править файлы и пересобирать сайт.
 */
export async function LegalPage({ file }: { file: string }) {
  const text = fs.readFileSync(path.join(process.cwd(), "docs", file), "utf8");

  let support = "";
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("app_texts")
        .select("value")
        .eq("key", "support_contact")
        .maybeSingle();
      support = ((data as { value?: string } | null)?.value ?? "").trim();
    } catch {
      // База недоступна — документ всё равно должен открыться.
    }
  }

  // Контакта ещё нет — не оставляем в юридическом документе пустое место
  // и не показываем человеку служебную метку.
  const filled = text.replaceAll(
    "{{поддержка}}",
    support || "напиши нам прямо в приложении, в разговоре с Досом",
  );

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

      <Markdown text={filled} />

      <p className="mt-8 border-t border-violet-100 pt-4 text-xs leading-relaxed text-[#8A85A3]">
        Если тебе плохо прямо сейчас — звони <b>150</b> (линия доверия, бесплатно,
        круглосуточно) или <b>112</b>, если опасность прямо сейчас.
      </p>
    </main>
  );
}
