import type { ReactNode } from "react";

/**
 * Маленький разборщик markdown — ровно под то, что есть в docs/*.md:
 * заголовки, списки, нумерованные пункты, жирный текст и абзацы.
 * Отдельная библиотека ради этого не нужна.
 */
function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <b key={`${key}-${i}`}>{part.slice(2, -2)}</b>
    ) : (
      <span key={`${key}-${i}`}>{part}</span>
    ),
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flush() {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <li key={i} className="ml-5 list-outside list-disc">
        {inline(item, `li-${blocks.length}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="my-2 space-y-1.5">
          {list.items.map((item, i) => (
            <li key={i} className="ml-5 list-outside list-decimal">
              {inline(item, `ol-${blocks.length}-${i}`)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={blocks.length} className="my-2 space-y-1.5">
          {items}
        </ul>
      ),
    );
    list = null;
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();

    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push(
        <h2 key={blocks.length} className="mt-5 mb-1 text-base font-extrabold">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flush();
      blocks.push(
        <h1 key={blocks.length} className="mb-3 text-2xl font-extrabold">
          {line.slice(2)}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(line.slice(2));
      continue;
    }
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flush();
    blocks.push(
      <p key={blocks.length} className="my-2 leading-relaxed">
        {inline(line, `p-${blocks.length}`)}
      </p>,
    );
  }
  flush();

  return <div className="text-sm">{blocks}</div>;
}
