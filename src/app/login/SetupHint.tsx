/** Показывается, пока приложение не видит ключи Supabase — чтобы вместо ошибки была инструкция. */
export function SetupHint() {
  return (
    <div className="rounded-2xl bg-white p-5 text-sm leading-relaxed shadow-sm">
      <div className="mb-2 text-base font-extrabold">Осталось подключить базу</div>
      <ol className="list-decimal space-y-1.5 pl-4 text-tynysh-muted">
        <li>
          Создай проект на <b>supabase.com</b> (бесплатно).
        </li>
        <li>
          Открой <b>SQL Editor</b> и выполни файл <code>supabase/schema.sql</code>.
        </li>
        <li>
          В <b>Project Settings → API Keys</b> скопируй <b>Project URL</b> и{" "}
          <b>Publishable key</b>.
        </li>
        <li>
          Вставь их под именами <code>NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>:
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              на компьютере — в файл <code>.env.local</code>;
            </li>
            <li>
              на Vercel — <b>Settings → Environment Variables</b>, отметив{" "}
              <b>Production</b>.
            </li>
          </ul>
        </li>
        <li>
          Перезапусти: на компьютере — заново <code>npm run dev</code>, на Vercel —{" "}
          <b>Deployments → ⋯ → Redeploy</b>. Ключи подхватываются в момент сборки.
        </li>
      </ol>
      <p className="mt-3 text-xs text-[#8A85A3]">
        Подробно и по шагам — в файле <code>SETUP.md</code>.
      </p>
    </div>
  );
}
