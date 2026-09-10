import { useState, useEffect, useRef } from "react";

// ---------- данные-заглушки (в реальном продукте — база данных) ----------
const USERS = [
  { id: "u1", name: "Аружан", handle: "aruzhan_07", phone: "+7 701 ···· 12", bio: "рисую, слушаю k-pop", online: true },
  { id: "u2", name: "Даниял", handle: "danik_fc", phone: "+7 777 ···· 45", bio: "футбол, FIFA, физика", online: false, lastSeen: "час назад" },
  { id: "u3", name: "Мия", handle: "miya.reads", phone: "+7 705 ···· 90", bio: "книги и котики", online: true },
  { id: "u4", name: "Алихан", handle: "alikhan_beats", phone: "+7 747 ···· 31", bio: "делаю биты на телефоне", online: true },
  { id: "u5", name: "Сабина", handle: "sabi_dance", phone: "+7 702 ···· 77", bio: "танцы, ЕНТ, стресс 😅", online: false, lastSeen: "вчера" },
  { id: "u6", name: "Мама", handle: "gulnara_a", phone: "+7 701 ···· 08", bio: "", online: false, lastSeen: "5 мин назад" },
];

const CRISIS_WORDS = ["не хочу жить", "покончить", "самоуб", "убить себя", "порезать", "умереть", "исчезнуть навсегда", "нет смысла жить"];

const FREE_LIMIT = 15; // сообщений Досу в день бесплатно

const SYSTEM_PROMPT = `Ты — Дос, встроенный в мессенджер Tynysh помощник по эмоциональной поддержке. Собеседник — чаще всего подросток или молодой человек, пишет по-русски (иногда по-казахски — отвечай на языке собеседника).

Как ты работаешь (подход психолога-консультанта):
1. Сначала выслушай и отрази чувства своими словами («звучит так, будто тебе очень обидно»). Не спеши с советами.
2. Задавай по одному открытому вопросу за раз. Помогай человеку самому понять, что происходит.
3. Используй простые приёмы КПТ: помоги заметить мысль → чувство → действие; предложи проверить мысль фактами; техники дыхания и заземления, если сильная тревога.
4. Говори просто, тепло, без нравоучений. Коротко: 2–5 предложений, не лекции. Можно 1 эмодзи, не больше.
5. Не ставь диагнозы и не называй расстройства. Не назначай лекарства.
6. Ты не заменяешь живого психолога. Если проблема тяжёлая или повторяется — мягко предложи поговорить с психологом или взрослым, которому человек доверяет.

Безопасность (самое важное):
- При признаках мыслей о самоповреждении, суициде, насилии над собеседником, травле или давлении со стороны взрослых с непонятными намерениями — оставайся рядом, не паникуй, не читай мораль. Дай контакты: 150 (детская линия доверия, Казахстан, круглосуточно, бесплатно), 111 (единый контакт-центр для детей и семьи), 112 (если опасность прямо сейчас). Предложи рассказать близкому взрослому.
- Не обсуждай способы причинения вреда. Не давай инструкций по диетам и весу.
- Никогда не проси личные данные, адрес, фото. Не поощряй скрывать общение от родителей.
- Если кто-то в сети просит встретиться, прислать фото или держать секрет — объясни, что это опасный признак.`;

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toISOString().slice(0, 10);

// ---------- мелкие компоненты ----------
function Avatar({ name, isAI, size = 44, online }) {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full grid place-items-center font-bold text-white"
        style={{ background: isAI ? "linear-gradient(135deg,#FFB547,#FF7A59)" : `hsl(${hue} 55% 55%)`, fontSize: size * 0.4 }}>
        {isAI ? "☼" : name[0]}
      </div>
      {online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
    </div>
  );
}

function Bubble({ m, meId, onDelete }) {
  const mine = m.from === meId;
  const ai = m.from === "ai";
  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"} mb-1.5`}>
      {mine && <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-40 text-xs mr-2 self-center">удалить</button>}
      <div className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap ${mine ? "text-white rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"}`}
        style={mine ? { background: "#5B4BDB" } : ai ? { background: "#FFF3DC", color: "#3A2E12" } : { background: "#fff", color: "#241F3B" }}>
        {!mine && m.senderName && <div className="text-xs font-bold opacity-60 mb-0.5">{m.senderName}</div>}
        {m.text}
        <div className={`text-[10px] mt-1 text-right ${mine ? "text-white/70" : "opacity-40"}`}>{m.time}{mine && (m.read ? " ✓✓" : " ✓")}</div>
      </div>
    </div>
  );
}

function CrisisCard({ onClose }) {
  return (
    <div className="rounded-2xl p-4 mb-3 text-sm" style={{ background: "#FFE4E1", color: "#5A1F17" }}>
      <div className="font-bold text-base mb-1">Ты не один. Помощь есть прямо сейчас</div>
      <div>📞 <b>150</b> — линия доверия, бесплатно, 24/7</div>
      <div>📞 <b>111</b> — контакт-центр для детей и семьи</div>
      <div>🚨 <b>112</b> — если опасность прямо сейчас</div>
      <div className="mt-2 opacity-80">Расскажи близкому человеку. Дос останется с тобой в чате.</div>
      <button onClick={onClose} className="mt-2 text-xs underline opacity-70">Скрыть</button>
    </div>
  );
}

// ---------- главный компонент ----------
export default function App() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chats");
  const [chats, setChats] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [groupDraft, setGroupDraft] = useState(null);
  const [premium, setPremium] = useState(false);
  const [usage, setUsage] = useState({ day: today(), n: 0 });
  const [paywall, setPaywall] = useState(false);
  const endRef = useRef(null);

  // загрузка аккаунта и чатов
  useEffect(() => {
    (async () => {
      try {
        const acc = JSON.parse((await window.storage.get("tynysh:account")).value);
        setMe(acc.me); setPremium(!!acc.premium); if (acc.usage) setUsage(acc.usage);
        try { setChats(JSON.parse((await window.storage.get("tynysh:chats")).value)); } catch {}
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!me || Object.keys(chats).length === 0) return;
    window.storage.set("tynysh:chats", JSON.stringify(chats)).catch(() => {});
  }, [chats, me]);

  useEffect(() => {
    if (!me) return;
    window.storage.set("tynysh:account", JSON.stringify({ me, premium, usage })).catch(() => {});
  }, [me, premium, usage]);

  // стартовые чаты у нового пользователя
  useEffect(() => {
    if (!me || Object.keys(chats).length > 0) return;
    setChats({
      ai: { type: "ai", title: "Дос", members: ["ai"], messages: [{ id: uid(), from: "ai", text: `Привет, ${me.name}! Я Дос — можно выговориться, когда некому. Без оценок. Как ты?`, time: now() }] },
      dm_u6: { type: "dm", title: "Мама", members: ["u6", me.id], messages: [{ id: uid(), from: "u6", text: "Ты поел? Во сколько будешь?", time: "14:10" }] },
      g_ent: { type: "group", title: "11Б без паники", members: ["u2", "u5", "u1", me.id], messages: [
        { id: uid(), from: "u5", senderName: "Сабина", text: "у кого-то тоже трясёт перед пробным?", time: "18:02" },
        { id: uid(), from: "u2", senderName: "Даниял", text: "да, вчера 3 часа не мог уснуть", time: "18:05" },
      ] },
    });
    setActiveId("ai");
  }, [me, chats]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats, activeId, typing]);

  const active = chats[activeId];

  function pushMsg(chatId, msg) {
    setChats((c) => ({ ...c, [chatId]: { ...c[chatId], messages: [...c[chatId].messages, msg] } }));
  }
  function deleteMsg(chatId, id) {
    setChats((c) => ({ ...c, [chatId]: { ...c[chatId], messages: c[chatId].messages.filter((m) => m.id !== id) } }));
  }
  function openDM(user) {
    const id = "dm_" + user.id;
    if (!chats[id]) setChats((c) => ({ ...c, [id]: { type: "dm", title: user.name, members: [user.id, me.id], messages: [] } }));
    setActiveId(id); setTab("chats"); setQuery("");
  }
  async function logout() {
    try { await window.storage.delete("tynysh:account"); await window.storage.delete("tynysh:chats"); } catch {}
    setMe(null); setChats({}); setActiveId(null); setPremium(false); setUsage({ day: today(), n: 0 });
  }

  async function askAI(history) {
    setTyping(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYSTEM_PROMPT,
          messages: history.map((m) => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text })) }),
      });
      const d = await r.json();
      const text = (d.content || []).map((b) => b.text || "").join("").trim() || "Я здесь. Расскажи ещё?";
      pushMsg("ai", { id: uid(), from: "ai", text, time: now() });
    } catch {
      pushMsg("ai", { id: uid(), from: "ai", text: "Связь пропала, но я рядом. Напиши ещё раз чуть позже.", time: now() });
    }
    setTyping(false);
  }

  function send() {
    const text = input.trim();
    if (!text || !active) return;
    if (active.type === "ai" && !premium) {
      const n = usage.day === today() ? usage.n : 0;
      if (n >= FREE_LIMIT) { setPaywall(true); return; }
      setUsage({ day: today(), n: n + 1 });
    }
    setInput("");
    const msg = { id: uid(), from: me.id, text, time: now(), read: false };
    if (CRISIS_WORDS.some((w) => text.toLowerCase().includes(w))) setCrisis(true);
    pushMsg(activeId, msg);

    if (active.type === "ai") askAI([...active.messages, msg]);
    else if (active.type === "dm") {
      const other = USERS.find((u) => u.id === active.members[0]);
      setTimeout(() => setChats((c) => ({ ...c, [activeId]: { ...c[activeId], messages: c[activeId].messages.map((m) => ({ ...m, read: true })) } })), 700);
      setTimeout(() => pushMsg(activeId, { id: uid(), from: other.id, text: ["ооо привет!", "ахах да", "а ты как?", "погнали в группу?", "ща отвечу, на уроке"][Math.floor(Math.random() * 5)], time: now() }), 1500);
    }
  }

  function createGroup() {
    if (!groupDraft?.name.trim() || groupDraft.members.size === 0) return;
    const id = "g_" + uid();
    setChats((c) => ({ ...c, [id]: { type: "group", title: groupDraft.name.trim(), members: [...groupDraft.members, me.id], messages: [] } }));
    setGroupDraft(null); setActiveId(id); setTab("chats");
  }

  const font = { fontFamily: "Nunito, system-ui, sans-serif" };
  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&display=swap" rel="stylesheet" />;

  if (loading) return <div className="min-h-screen grid place-items-center" style={{ background: "#F6F3FF", color: "#5B4BDB", ...font }}>Загружаем…</div>;

  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center p-6" style={{ background: "#F6F3FF", ...font }}>
        {fontLink}
        <div className="w-full max-w-sm">
          <div className="text-5xl font-extrabold tracking-tight mb-1" style={{ color: "#5B4BDB" }}>tynysh</div>
          <div className="text-lg mb-8" style={{ color: "#5F5A78" }}>Мессенджер, где есть кому выслушать.</div>
          <PhoneLogin onDone={setMe} />
          <p className="text-xs mt-6 leading-relaxed" style={{ color: "#8A85A3" }}>Дос — помощник для поддержки, а не врач. Если тебе плохо прямо сейчас — звони 150 (бесплатно, круглосуточно).</p>
        </div>
      </div>
    );
  }

  const chatList = Object.entries(chats).sort(([a], [b]) => (a === "ai" ? -1 : b === "ai" ? 1 : 0));
  const q = query.replace("@", "").toLowerCase().trim();
  const found = q ? USERS.filter((u) => (u.handle + u.name + u.phone).toLowerCase().includes(q)) : USERS;
  const left = premium ? "∞" : Math.max(0, FREE_LIMIT - (usage.day === today() ? usage.n : 0));

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#F6F3FF", color: "#241F3B", ...font }}>
      {fontLink}

      {/* ----- левая колонка ----- */}
      <aside className={`w-full md:w-80 shrink-0 flex flex-col border-r border-violet-100 bg-white ${active ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold" style={{ color: "#5B4BDB" }}>tynysh</div>
          <button onClick={logout} title="Выйти" className="text-sm opacity-60 hover:opacity-100">@{me.handle} ✕</button>
        </div>

        <div className="flex mx-4 mb-2 rounded-xl p-1 text-sm font-bold" style={{ background: "#EEEAFF" }}>
          {[["chats", "Чаты"], ["contacts", "Контакты"], ["groups", "Группы"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-1.5 rounded-lg transition ${tab === k ? "bg-white shadow-sm" : "opacity-60"}`} style={{ color: tab === k ? "#5B4BDB" : undefined }}>{l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {tab === "chats" && chatList.map(([id, c]) => {
            const last = c.messages[c.messages.length - 1];
            const u = c.type === "dm" ? USERS.find((x) => x.id === c.members[0]) : null;
            return (
              <button key={id} onClick={() => setActiveId(id)} className={`w-full flex gap-3 items-center p-2.5 rounded-xl text-left transition ${activeId === id ? "bg-violet-50" : "hover:bg-slate-50"}`}>
                <Avatar name={c.title} isAI={c.type === "ai"} online={u?.online} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold flex items-center gap-1 truncate">{c.type === "group" && <span className="opacity-40">#</span>}{c.title}
                    {c.type === "ai" && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FFF3DC", color: "#9A5B00" }}>поддержка</span>}
                  </div>
                  <div className="text-xs opacity-60 truncate">{last ? last.text : "Напиши первым"}</div>
                </div>
                {last && <div className="text-[10px] opacity-40 self-start">{last.time}</div>}
              </button>
            );
          })}

          {tab === "contacts" && (
            <div className="px-1">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@юзернейм, имя или телефон" className="w-full mb-2 px-3 py-2 rounded-xl border border-violet-100 outline-none focus:border-violet-400" />
              {found.map((u) => (
                <button key={u.id} onClick={() => openDM(u)} className="w-full flex gap-3 items-center p-2.5 rounded-xl text-left hover:bg-slate-50">
                  <Avatar name={u.name} online={u.online} />
                  <div className="min-w-0">
                    <div className="font-bold">{u.name} <span className="font-medium opacity-50">@{u.handle}</span></div>
                    <div className="text-xs opacity-60 truncate">{u.online ? "в сети" : `был(а) ${u.lastSeen}`}{u.bio && ` · ${u.bio}`}</div>
                  </div>
                </button>
              ))}
              {found.length === 0 && <div className="text-sm opacity-60 p-3">Никого не нашли. Проверь написание или пригласи по ссылке.</div>}
              <button onClick={() => navigator.clipboard?.writeText(`https://tynysh.kz/@${me.handle}`)} className="w-full mt-2 py-2 rounded-xl text-sm font-bold" style={{ background: "#EEEAFF", color: "#5B4BDB" }}>Скопировать ссылку-приглашение</button>
            </div>
          )}

          {tab === "groups" && (
            <div className="px-1">
              {!groupDraft ? (
                <>
                  <button onClick={() => setGroupDraft({ name: "", members: new Set() })} className="w-full py-2.5 rounded-xl font-bold text-white mb-3" style={{ background: "#5B4BDB" }}>+ Создать группу</button>
                  {chatList.filter(([, c]) => c.type === "group").map(([id, c]) => (
                    <button key={id} onClick={() => { setActiveId(id); setTab("chats"); }} className="w-full flex gap-3 items-center p-2.5 rounded-xl text-left hover:bg-slate-50">
                      <Avatar name={c.title} /><div><div className="font-bold">#{c.title}</div><div className="text-xs opacity-60">{c.members.length} участника</div></div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="space-y-2">
                  <input autoFocus value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} placeholder="Название группы" className="w-full px-3 py-2 rounded-xl border border-violet-100 outline-none focus:border-violet-400" />
                  <div className="text-xs font-bold opacity-60 px-1 pt-1">Участники</div>
                  {USERS.map((u) => {
                    const on = groupDraft.members.has(u.id);
                    return (
                      <button key={u.id} onClick={() => { const s = new Set(groupDraft.members); on ? s.delete(u.id) : s.add(u.id); setGroupDraft({ ...groupDraft, members: s }); }}
                        className={`w-full flex gap-3 items-center p-2 rounded-xl text-left ${on ? "bg-violet-50" : "hover:bg-slate-50"}`}>
                        <Avatar name={u.name} size={32} /><div className="font-bold text-sm flex-1">{u.name}</div>{on && <span style={{ color: "#5B4BDB" }}>✓</span>}
                      </button>
                    );
                  })}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setGroupDraft(null)} className="flex-1 py-2 rounded-xl font-bold opacity-60">Отмена</button>
                    <button onClick={createGroup} className="flex-1 py-2 rounded-xl font-bold text-white" style={{ background: "#5B4BDB" }}>Создать</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* плашка премиума */}
        <button onClick={() => setPaywall(true)} className="m-3 p-3 rounded-2xl text-left text-sm" style={{ background: premium ? "#E6F7EF" : "#FFF3DC" }}>
          <div className="font-bold">{premium ? "Дос Plus активен" : "Дос Plus — 990 ₸/мес"}</div>
          <div className="text-xs opacity-70">{premium ? "Безлимитные разговоры, история и голос" : `Сегодня осталось ${left} бесплатных сообщений Досу`}</div>
        </button>
      </aside>

      {/* ----- окно чата ----- */}
      {active ? (
        <main className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-violet-100">
            <button onClick={() => setActiveId(null)} className="md:hidden text-2xl opacity-60 px-1">‹</button>
            <Avatar name={active.title} isAI={active.type === "ai"} />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{active.type === "group" && "#"}{active.title}</div>
              <div className="text-xs opacity-60">{active.type === "ai" ? "всегда на связи · не заменяет врача" : active.type === "group" ? `${active.members.length} участника` : (USERS.find((u) => u.id === active.members[0])?.online ? "в сети" : "был(а) недавно")}</div>
            </div>
            {active.type !== "ai" && <button onClick={() => setActiveId("ai")} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "#FFF3DC", color: "#9A5B00" }}>Дос</button>}
            <button onClick={() => { setActiveId("ai"); setCrisis(true); }} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "#FFE4E1", color: "#B3261E" }}>SOS</button>
            <button onClick={() => setShowInfo(!showInfo)} className="text-xl opacity-50">ⓘ</button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {crisis && <CrisisCard onClose={() => setCrisis(false)} />}
            {active.messages.length === 0 && <div className="text-sm opacity-50 text-center mt-10">{active.type === "group" ? "Группа создана. Первое сообщение — за тобой." : "Напиши первым. Простое «привет» — уже начало."}</div>}
            {active.messages.map((m) => <Bubble key={m.id} m={m} meId={me.id} onDelete={(id) => deleteMsg(activeId, id)} />)}
            {typing && <div className="text-sm opacity-50 pl-2">Дос печатает…</div>}
            <div ref={endRef} />
          </div>

          {active.type === "ai" && active.messages.length < 3 && (
            <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
              {["Стресс из-за учёбы", "Поссорился с другом", "Не могу уснуть", "Меня травят", "Просто тяжело"].map((t) => (
                <button key={t} onClick={() => setInput(t)} className="shrink-0 text-sm px-3 py-1.5 rounded-full bg-white border border-violet-100">{t}</button>
              ))}
            </div>
          )}

          <div className="p-3 bg-white border-t border-violet-100 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Сообщение" className="flex-1 px-4 py-2.5 rounded-full outline-none" style={{ background: "#F6F3FF" }} />
            <button onClick={send} className="px-5 rounded-full font-bold text-white" style={{ background: "#5B4BDB" }}>↑</button>
          </div>
        </main>
      ) : (
        <main className="hidden md:grid flex-1 place-items-center opacity-40 text-sm">Выбери чат слева</main>
      )}

      {/* ----- инфо-панель ----- */}
      {showInfo && active && (
        <aside className="hidden lg:block w-72 shrink-0 bg-white border-l border-violet-100 p-4 text-sm space-y-4">
          <div className="font-extrabold text-base">{active.type === "ai" ? "Про Доса" : active.title}</div>
          {active.type === "ai" ? (
            <ul className="space-y-2 opacity-80 leading-snug">
              <li>Переписку с Досом не видит никто, кроме тебя. Она хранится только на твоём устройстве.</li>
              <li>Дос не врач и не ставит диагнозы. Он помогает разобраться и подскажет, когда лучше обратиться к живому специалисту.</li>
              <li>При угрозе жизни Дос покажет номера помощи.</li>
            </ul>
          ) : (
            <>
              <div className="opacity-80">{active.type === "group" ? "Участники" : "Профиль"}</div>
              {active.members.filter((id) => id !== me.id).map((id) => { const u = USERS.find((x) => x.id === id); return u && <div key={id} className="flex gap-2 items-center"><Avatar name={u.name} size={32} /><div><div className="font-bold">{u.name}</div><div className="text-xs opacity-60">@{u.handle}</div></div></div>; })}
              <button className="w-full py-2 rounded-xl font-bold" style={{ background: "#FFE4E1", color: "#B3261E" }}>Пожаловаться / заблокировать</button>
              <div className="text-xs opacity-60 leading-snug">Если кто-то просит фото, встречу или «никому не говорить» — это красный флаг. Нажми SOS, Дос поможет.</div>
            </>
          )}
        </aside>
      )}

      {/* ----- оплата ----- */}
      {paywall && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" onClick={() => setPaywall(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl font-extrabold mb-1">Дос Plus</div>
            <div className="text-sm opacity-70 mb-4">Бесплатно — {FREE_LIMIT} сообщений Досу в день. С Plus:</div>
            <ul className="text-sm space-y-1.5 mb-5">
              <li>✓ Безлимитные разговоры с Досом</li>
              <li>✓ Дос помнит прошлые разговоры</li>
              <li>✓ Голосовые сообщения Досу</li>
              <li>✓ Дневник настроения и итоги недели</li>
              <li>✓ Скидка на консультацию живого психолога-партнёра</li>
            </ul>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 rounded-2xl p-3 border-2" style={{ borderColor: "#5B4BDB" }}><div className="font-extrabold">990 ₸</div><div className="text-xs opacity-60">в месяц</div></div>
              <div className="flex-1 rounded-2xl p-3 border border-violet-100"><div className="font-extrabold">7 900 ₸</div><div className="text-xs opacity-60">в год · −33%</div></div>
            </div>
            <button onClick={() => { setPremium(true); setPaywall(false); }} className="w-full py-3 rounded-xl font-extrabold text-white" style={{ background: "#5B4BDB" }}>Оплатить через Kaspi</button>
            <button onClick={() => setPaywall(false)} className="w-full py-2 text-sm opacity-60">Не сейчас</button>
            <div className="text-[11px] opacity-50 mt-2">Демо: оплата не списывается. Обычные чаты и группы бесплатны всегда.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- вход по номеру телефона (как в Telegram) ----------
function PhoneLogin({ onDone }) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [age, setAge] = useState("");
  const inp = "w-full px-4 py-3 rounded-xl bg-white border border-violet-100 outline-none focus:border-violet-400";
  const btn = "w-full py-3 rounded-xl font-extrabold text-white disabled:opacity-40";

  if (step === 0) return (
    <div className="space-y-3">
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 7__ ___ __ __" className={inp} inputMode="tel" />
      <button disabled={phone.replace(/\D/g, "").length < 11} onClick={() => setStep(1)} className={btn} style={{ background: "#5B4BDB" }}>Получить код</button>
      <div className="text-xs opacity-60">Пришлём SMS с кодом. Номер никому не показывается.</div>
    </div>
  );
  if (step === 1) return (
    <div className="space-y-3">
      <div className="text-sm opacity-70">Код отправлен на {phone}. В демо подходит любой код из 4 цифр.</div>
      <input autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Код из SMS" className={`${inp} tracking-[0.5em] text-center text-xl`} inputMode="numeric" />
      <button disabled={code.length < 4} onClick={() => setStep(2)} className={btn} style={{ background: "#5B4BDB" }}>Подтвердить</button>
      <button onClick={() => setStep(0)} className="text-sm opacity-60">Изменить номер</button>
    </div>
  );
  const ok = name.trim() && handle.length >= 3 && +age >= 13;
  return (
    <div className="space-y-3">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className={inp} />
      <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, "").toLowerCase())} placeholder="Юзернейм, например kai_07" className={inp} />
      <input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="Возраст" className={inp} />
      {age && +age > 0 && +age < 13 && <div className="text-xs" style={{ color: "#B3261E" }}>Tynysh — с 13 лет.</div>}
      <button disabled={!ok} onClick={() => onDone({ id: "me", name: name.trim(), handle, phone })} className={btn} style={{ background: "#5B4BDB" }}>Начать общение</button>
    </div>
  );
}
