/** Типы и мелкие помощники для чатов. Таблицы — в supabase/schema.sql. */

export type ChatType = "dm" | "group";

/** Одна строка списка чатов — то, что возвращает функция chat_overview() в базе. */
export type ChatOverviewRow = {
  chat_id: string;
  chat_type: ChatType;
  chat_title: string | null;
  other_id: string | null;
  other_handle: string | null;
  other_name: string | null;
  members_count: number;
  last_text: string | null;
  last_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  sender_id: string | null;
  text: string;
  created_at: string;
};

export type Member = {
  user_id: string;
  role: string;
  last_read_at: string | null;
  name: string;
  handle: string;
};

/** Как называется чат в списке: у группы — название, у личного — имя собеседника. */
export function chatName(row: ChatOverviewRow): string {
  if (row.chat_type === "group") return row.chat_title ?? "Группа";
  return row.other_name ?? "Человек";
}

// Время показываем по Казахстану — одинаково на сервере и в браузере.
// Иначе на сервере (там UTC) и на телефоне получались бы разные часы.
const TZ = "Asia/Almaty";

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

const dayFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
});

const fullDayFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});

const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 14:05 */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** В списке чатов: сегодняшние — время, остальные — дата. */
export function formatListTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return keyFmt.format(date) === keyFmt.format(new Date())
    ? timeFmt.format(date)
    : dayFmt.format(date);
}

/** Разделитель в переписке: «Сегодня», «Вчера» или «12 мая». */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const key = keyFmt.format(date);
  const today = keyFmt.format(new Date());
  const yesterday = keyFmt.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (key === today) return "Сегодня";
  if (key === yesterday) return "Вчера";
  return fullDayFmt.format(date);
}

/** Ключ дня — по нему решаем, ставить ли разделитель между сообщениями. */
export function dayKey(iso: string): string {
  return keyFmt.format(new Date(iso));
}

/**
 * Прочитано ли моё сообщение. Считаем по самой «отстающей» отметке собеседников:
 * в группе галочки становятся двойными, когда прочитали все.
 */
export function readUpTo(members: Member[], meId: string): number {
  const others = members.filter((m) => m.user_id !== meId);
  if (others.length === 0) return 0;
  return Math.min(
    ...others.map((m) => (m.last_read_at ? Date.parse(m.last_read_at) : 0)),
  );
}

/** «1 участник», «2 участника», «5 участников» — по-русски. */
export function membersLabel(count: number): string {
  const last = count % 10;
  const tens = count % 100;
  if (tens >= 11 && tens <= 14) return `${count} участников`;
  if (last === 1) return `${count} участник`;
  if (last >= 2 && last <= 4) return `${count} участника`;
  return `${count} участников`;
}
