/** Показывается, пока не заполнен .env.local — чтобы вместо ошибки была инструкция. */
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
          В <b>Project Settings → API</b> скопируй Project URL и ключ <code>anon</code>.
        </li>
        <li>
          Скопируй файл <code>.env.local.example</code> в <code>.env.local</code> и
          вставь туда эти два значения.
        </li>
        <li>
          Останови сервер и запусти заново: <code>npm run dev</code>.
        </li>
      </ol>
      <p className="mt-3 text-xs text-[#8A85A3]">
        Подробно и по шагам — в файле <code>SETUP.md</code>.
      </p>
    </div>
  );
}
