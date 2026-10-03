/**
 * Поиск людей должен прощать раскладку. У нас половина имён кириллицей
 * («Бека»), а ищут их латиницей («beka») — и наоборот: @juzernejm набран
 * латиницей, а человек печатает по-русски. Без перевода туда-сюда поиск
 * «не находит никого», хотя человек в базе есть.
 *
 * Перевод нарочно грубый: для поиска важно совпасть, а не быть точным.
 */

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  // казахские буквы — их часто набирают ближайшей латинской
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

// Длинные сочетания идут первыми, иначе «sh» распадётся на «s» и «h».
const LAT_TO_CYR: [string, string][] = [
  ["sch", "щ"], ["shh", "щ"], ["zh", "ж"], ["kh", "х"], ["ch", "ч"],
  ["sh", "ш"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["yo", "ё"],
  ["a", "а"], ["b", "б"], ["v", "в"], ["g", "г"], ["d", "д"], ["e", "е"],
  ["z", "з"], ["i", "и"], ["j", "й"], ["k", "к"], ["l", "л"], ["m", "м"],
  ["n", "н"], ["o", "о"], ["p", "п"], ["r", "р"], ["s", "с"], ["t", "т"],
  ["u", "у"], ["f", "ф"], ["h", "х"], ["c", "ц"], ["y", "ы"], ["q", "қ"],
  ["w", "в"], ["x", "кс"],
];

function cyrToLat(text: string): string {
  return [...text].map((ch) => CYR_TO_LAT[ch] ?? ch).join("");
}

function latToCyr(text: string): string {
  let rest = text;
  let out = "";
  outer: while (rest.length > 0) {
    for (const [from, to] of LAT_TO_CYR) {
      if (rest.startsWith(from)) {
        out += to;
        rest = rest.slice(from.length);
        continue outer;
      }
    }
    out += rest[0];
    rest = rest.slice(1);
  }
  return out;
}

/**
 * Что искать в базе: само слово плюс его вид в другой раскладке.
 * Пустые и повторяющиеся варианты отбрасываем — лишние условия только
 * замедляют запрос.
 */
export function searchVariants(term: string): string[] {
  const base = term.toLowerCase();
  const seen = new Set<string>();

  for (const variant of [base, cyrToLat(base), latToCyr(base)]) {
    const clean = variant.trim();
    if (clean.length > 0) seen.add(clean);
  }
  return [...seen];
}
