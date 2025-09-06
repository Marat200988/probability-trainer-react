import React, { useEffect, useMemo, useState } from 'react'

const TZ = "Europe/Berlin";
const LS_KEY = "prob-trainer-v1";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("/", "-");
}

function cls(...arr) {
  return arr.filter(Boolean).join(" ");
}

function saveLS(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}
function loadLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Question Bank
const BANK = [
  {
    id: "coin-6-heads",
    type: "mcq",
    prompt: "Монета подбрасывается 6 раз. Какова вероятность, что все 6 выпадут \"орлом\"?",
    options: ["1/12", "1/64", "1/128", "1/256"],
    evaluate(user) {
      const correctIdx = 1; // (1/2)^6 = 1/64
      const correct = user === correctIdx;
      const explain = "Каждый бросок 1/2. Независимость: (1/2)^6 = 1/64 ≈ 1.5625%.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["базовые вероятности"],
  },
  {
    id: "base-rate-med",
    type: "mcq",
    prompt: "Тест на редкую болезнь: чувствит./специфичность 95%. Распространённость 1/1000. Положительный результат. Какова реальная вероятность болезни?",
    options: ["~2%", "~50%", "~95%", "~99%"],
    evaluate(user) {
      const correctIdx = 0;
      const correct = user === correctIdx;
      const explain = "Из 1000: 1 болен → 0.95 TP; 999 здоровы → ~49.95 FP. P(болезнь|+) ≈ 0.95/(0.95+49.95) ≈ 1.87%.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["теорема Байеса", "базовая частота"],
  },
  {
    id: "ev-invest",
    type: "short",
    prompt: "Инвестиция 100₽: 20% шанс +500₽, 80% шанс −100₽. Стоит ли играть, если ориентироваться на ожидаемое значение (EV)? Одной фразой.",
    evaluate(userText) {
      const EV = 0.2 * 500 + 0.8 * -100; // +20
      const normalized = (userText || "").toLowerCase();
      const hit = ["ev", "ожидаем", "+20", "полож", "плюс", ">0"].some(k => normalized.includes(k));
      const explain = `EV = 0.2×500 + 0.8×(−100) = +${EV}₽ → игра рациональна (при контроле риска и банкролла).`;
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["expected value"],
  },
  {
    id: "bus-wait",
    type: "numeric",
    prompt: "Автобус приходит каждые 10 минут, ты приходишь случайно. Среднее ожидание (минуты)?",
    answer: { min: 4.9, max: 5.1 },
    evaluate(userNumber) {
      const num = Number(userNumber);
      const correct = !isNaN(num) && num >= 4.9 && num <= 5.1;
      const explain = "Равномерное распределение на [0,10] → матожидание 10/2 = 5 минут.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["равномерное"],
  },
  {
    id: "nuclear-risk",
    type: "short",
    prompt: "Компания заявляет: риск аварии 0.01%/год, значит \"практически невозможно\". Что упускают?",
    evaluate(userText) {
      const t = (userText || "").toLowerCase();
      const hit = ["горизонт", "кумулятив", "накоп", "много лет", "tail", "чёрн", "черн", "black", "лебед"].some(k => t.includes(k));
      const explain = "Накопление риска на горизонте (за 30 лет P≈1−(1−0.0001)^{30}≈0.3%) + недооценка хвостовых событий (fat tails) и последствий (severity).";
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["хвостовые риски"],
  },
  {
    id: "gambler-fallacy",
    type: "mcq",
    prompt: "Монета 5 раз подряд выпала орлом. Какова вероятность, что в 6-й раз будет решка?",
    options: ["меньше 50%", "ровно 50%", "больше 50%"],
    evaluate(user) {
      const correctIdx = 1;
      const correct = user === correctIdx;
      const explain = "Независимые броски → 50%. Ошибка игрока — ждать компенсации.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["когнитивные искажения"],
  },
  {
    id: "calibration-90",
    type: "short",
    prompt: "Калибровка: если ты говоришь \"уверен на 90%\", то в долгую это должно быть верно в ~скольких случаях из 100?",
    evaluate(txt) {
      const t = (txt || "").toLowerCase();
      const hit = t.includes("90") || t.includes("девяност");
      const explain = "Калибровка уверенности: 90% → верно примерно в 90 из 100 случаев.";
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["калибровка"],
  },
  {
    id: "simpson-paradox",
    type: "mcq",
    prompt: "Какое явление может перевернуть вывод при агрегировании данных по группам (например, успех терапии по полу/возрасту)?",
    options: ["Парадокс Бернулли", "Парадокс Симпсона", "Парадокс Монти Холла"],
    evaluate(user) {
      const correctIdx = 1;
      const correct = user === correctIdx;
      const explain = "Парадокс Симпсона: тренд в подгруппах может исчезать/обращаться при объединении данных.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["агрегирование"],
  },
  {
    id: "monty-hall",
    type: "mcq",
    prompt: "Задача Монти Холла: после открытия пустой двери стоит ли менять выбор?",
    options: ["Да, шанс 2/3", "Нет, шанс 1/2", "Не имеет значения"],
    evaluate(user) {
      const correctIdx = 0;
      const correct = user === correctIdx;
      const explain = "Менять выгодно: вероятность выигрыша 2/3.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["условная вероятность"],
  },
  {
    id: "regression-to-mean",
    type: "short",
    prompt: "Студент показал рекордный результат. В следующей попытке он, вероятно, покажет хуже. Как называется эффект?",
    evaluate(txt) {
      const t = (txt || "").toLowerCase();
      const hit = t.includes("регресс") || t.includes("средн");
      const explain = "Регрессия к среднему.";
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["регрессия к среднему"],
  },
  {
    id: "expected-utility",
    type: "short",
    prompt: "Почему положительное EV не всегда означает, что стратегию надо брать? Одним предложением.",
    evaluate(txt) {
      const t = (txt || "").toLowerCase();
      const hit = ["риск", "волат", "диспер", "банкрол", "utility", "полезн"].some(k => t.includes(k));
      const explain = "Из-за риска/дисперсии и ограниченного банкролла важна ожидаемая полезность, а не только EV.";
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["expected utility"],
  },
  {
    id: "birthday-paradox",
    type: "mcq",
    prompt: "Сколько людей нужно в комнате, чтобы вероятность совпадения дней рождения > 50%?",
    options: ["23", "183", "366"],
    evaluate(user) {
      const correctIdx = 0; // ≈23
      const correct = user === correctIdx;
      const explain = "Парадокс дней рождения: порог около 23 человек.";
      return { correct, score: correct ? 1 : 0, explain };
    },
    tags: ["комбинаторика"],
  },
  {
    id: "lln",
    type: "short",
    prompt: "Почему \"серия неудач\" не доказывает, что стратегия убыточна? Одной фразой.",
    evaluate(txt) {
      const t = (txt || "").toLowerCase();
      const hit = ["закон больших чисел", "выборка", "дисперс", "вариац"].some(k => t.includes(k));
      const explain = "Один отрезок может быть шумным; вывод делают по большой выборке (закон больших чисел/дисперсия).";
      return { correct: hit, score: hit ? 1 : 0, explain };
    },
    tags: ["закон больших чисел"],
  },
];

function sampleDaily(bank, n, seed) {
  const rng = mulberry32(hashCode(seed));
  const idx = bank.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map(i => bank[i]);
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    let t = a += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function brierScore(p, outcome) {
  const diff = p - outcome;
  return diff * diff;
}

function PrettyBadge({ children, kind = "default" }) {
  const styles = {
    default: "bg-gray-100 text-gray-800",
    good: "bg-green-100 text-green-800",
    bad: "bg-red-100 text-red-800",
    warn: "bg-yellow-100 text-yellow-800",
  };
  return <span className={cls("px-2 py-0.5 rounded-full text-xs", styles[kind])}>{children}</span>;
}

function Block({ title, children, right }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function QuestionCard({ q, onSubmit }) {
  const [choice, setChoice] = useState(null);
  const [num, setNum] = useState("");
  const [text, setText] = useState("");
  const [conf, setConf] = useState(70);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);

  function handleSubmit() {
    if (done) return;
    let userAns;
    if (q.type === "mcq") userAns = choice;
    if (q.type === "numeric") userAns = Number(num);
    if (q.type === "short") userAns = text;
    const { correct, score, explain } = q.evaluate(userAns);
    const p = Math.min(Math.max(conf / 100, 0.5), 1);
    const bs = brierScore(p, correct ? 1 : 0);
    const payload = { correct, score, explain, conf: conf / 100, brier: bs };
    setResult(payload);
    setDone(true);
    onSubmit?.(payload);
  }

  return (
    <div className="space-y-3">
      <div className="text-base md:text-lg">{q.prompt}</div>

      {q.type === "mcq" && (
        <div className="grid grid-cols-1 gap-2">
          {q.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={q.id}
                className="size-4"
                disabled={done}
                checked={choice === i}
                onChange={() => setChoice(i)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "numeric" && (
        <input
          type="number"
          step="any"
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Введи число"
          disabled={done}
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
      )}

      {q.type === "short" && (
        <textarea
          className="w-full border rounded-lg px-3 py-2"
          rows={2}
          placeholder="Короткий ответ"
          disabled={done}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Уверенность:</span>
        <input
          type="range"
          min={50}
          max={100}
          value={conf}
          disabled={done}
          onChange={(e) => setConf(Number(e.target.value))}
          className="w-40"
        />
        <PrettyBadge kind="warn">{conf}%</PrettyBadge>
      </div>

      {!done ? (
        <button onClick={handleSubmit} className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">
          Ответить
        </button>
      ) : (
        <div className="space-y-2">
          <div>{result?.correct ? <PrettyBadge kind="good">Верно</PrettyBadge> : <PrettyBadge kind="bad">Неверно</PrettyBadge>}</div>
          <div className="text-sm text-gray-700">{result?.explain}</div>
          <div className="text-xs text-gray-500">Brier score: {result?.brier?.toFixed(3)} (чем меньше, тем лучше)</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("daily"); // 'daily' | 'practice'
  const [session, setSession] = useState(() => {
    const loaded = loadLS();
    if (loaded && loaded.today === todayKey()) return loaded;
    return {
      today: todayKey(),
      dailyIds: sampleDaily(BANK, 5, todayKey()).map((q) => q.id),
      history: [],
    };
  });

  useEffect(() => { saveLS(session); }, [session]);

  const dailyQuestions = useMemo(
    () => session.dailyIds.map((id) => BANK.find((q) => q.id === id)).filter(Boolean),
    [session.dailyIds]
  );

  useEffect(() => {
    const i = setInterval(() => {
      const key = todayKey();
      setSession((s) => {
        if (s.today !== key) {
          return { today: key, dailyIds: sampleDaily(BANK, 5, key).map((q) => q.id), history: s.history };
        }
        return s;
      });
    }, 30000);
    return () => clearInterval(i);
  }, []);

  function onSubmit(qid, payload) {
    setSession((s) => ({
      ...s,
      history: [...s.history, { date: todayKey(), id: qid, correct: !!payload.correct, conf: payload.conf, brier: payload.brier, mode }],
    }));
  }

  const todays = session.history.filter((h) => h.date === session.today);
  const todaysBrier = todays.length > 0 ? todays.reduce((a, b) => a + (b.brier ?? 0), 0) / todays.length : null;

  function exportJSON() {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prob-trainer-${session.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const s = JSON.parse(String(reader.result)); setSession(s); } catch {}
    };
    reader.readAsText(file);
  }

  const practicePool = useMemo(() => BANK, []);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Вероятностный тренажёр</h1>
        <div className="flex items-center gap-2">
          <button
            className={cls("px-3 py-1.5 rounded-xl border", mode === "daily" ? "bg-black text-white" : "bg-white")}
            onClick={() => setMode("daily")}
          >Daily (5/день)</button>
          <button
            className={cls("px-3 py-1.5 rounded-xl border", mode === "practice" ? "bg-black text-white" : "bg-white")}
            onClick={() => setMode("practice")}
          >Practice</button>
        </div>
      </header>

      <Block
        title={mode === "daily" ? `Сегодня: ${session.today}` : "Режим Practice"}
        right={
          <div className="flex items-center gap-2">
            <button onClick={exportJSON} className="text-sm px-3 py-1 rounded-lg border">Экспорт</button>
            <label className="text-sm px-3 py-1 rounded-lg border cursor-pointer">
              Импорт
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
          </div>
        }
      >
        {mode === "daily" ? (
          <div className="space-y-6">
            {dailyQuestions.map((q) => (
              <div key={q.id} className="border border-gray-100 rounded-2xl p-4">
                <QuestionCard q={q} onSubmit={(p) => onSubmit(q.id, p)} />
              </div>
            ))}
            <div className="text-sm text-gray-600">
              Сделано сегодня: {todays.length} / {dailyQuestions.length}
              {todaysBrier != null && (<span className="ml-3">Средний Brier: {todaysBrier.toFixed(3)}</span>)}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {practicePool.map((q) => (
              <details key={q.id} className="border rounded-2xl p-4">
                <summary className="cursor-pointer font-medium mb-2">{q.prompt}</summary>
                <div className="pt-3">
                  <QuestionCard q={q} onSubmit={(p) => onSubmit(q.id, p)} />
                </div>
              </details>
            ))}
          </div>
        )}
      </Block>

      <Block title="Справка">
        <ul className="list-disc pl-6 text-sm leading-relaxed text-gray-700 space-y-1">
          <li>Daily: каждый день (по Берлину) 5 случайных задач. Данные сохраняются локально.</li>
          <li>Practice: тренируй любые задачи без ограничений.</li>
          <li>Brier score ∈ [0,1]: чем меньше, тем лучше калибровка уверенности.</li>
          <li>Говори в вероятностях и проверяй себя сериями, а не по одному исходу.</li>
        </ul>
      </Block>
    </div>
  );
}
