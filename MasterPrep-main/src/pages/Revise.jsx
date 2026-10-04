import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api";

const SUBJECTS = ["CN", "DBMS", "DSA", "OOPS", "OS"];

const SOURCE_LABEL = {
  quiz: "Missed in a quiz",
  daily: "Missed in a daily challenge",
  bookmark: "Bookmarked · Revise Later",
  interview: "From a mock interview",
};

const GRADES = [
  { grade: "again", label: "Again", key: "1", cls: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { grade: "hard", label: "Hard", key: "2", cls: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100" },
  { grade: "good", label: "Good", key: "3", cls: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  { grade: "easy", label: "Easy", key: "4", cls: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
];

const days = (n) => (n === 1 ? "1 day" : `${n} days`);
const shortDays = (n) => (n < 30 ? `${n}d` : n < 365 ? `${Math.round(n / 30)}mo` : "1y");

export default function Revise() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const subject = params.get("subject") || "";

  const [cards, setCards] = useState(null); // this session's queue
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [stats, setStats] = useState(null);

  // per-card UI state
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState(null); // MCQ result from the server
  const [busy, setBusy] = useState(false);

  /* 📥 Load the due queue (and reload when the subject filter changes) */
  useEffect(() => {
    let cancelled = false;
    const q = subject ? `?subject=${subject}` : "";
    Promise.all([apiFetch(`/revision/due${q}`), apiFetch("/revision/stats")]).then(
      ([due, st]) => {
        if (cancelled) return;
        setCards(due);
        setStats(st);
        setIndex(0);
        setReviewed(0);
        setRevealed(false);
        setSelected("");
        setResult(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [subject]);

  const card = cards?.[index];
  const sessionDone = cards !== null && !card && reviewed > 0;

  /* 🔄 Refresh stats at the end, so "due tomorrow" includes this session */
  useEffect(() => {
    if (sessionDone) apiFetch("/revision/stats").then(setStats);
  }, [sessionDone]);

  const nextCard = () => {
    setIndex((i) => i + 1);
    setRevealed(false);
    setSelected("");
    setResult(null);
  };

  /* 🃏 Theory: self-grade */
  const grade = useCallback(
    async (g) => {
      if (!card || busy) return;
      setBusy(true);
      try {
        await apiFetch(`/revision/${card.id}/review`, {
          method: "POST",
          body: JSON.stringify({ grade: g }),
        });
        setReviewed((n) => n + 1);
        setIndex((i) => i + 1);
        setRevealed(false);
      } finally {
        setBusy(false);
      }
    },
    [card, busy]
  );

  /* ✅ MCQ: the server checks the answer */
  const submitMcq = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/revision/${card.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ selected: card.options.indexOf(selected) }),
      });
      setResult(res);
      setReviewed((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  /* 🗑️ Drop a card from revision */
  const removeCard = async () => {
    if (!card) return;
    await apiFetch(`/revision/${card.id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setRevealed(false);
    setSelected("");
    setResult(null);
  };

  /* ⌨️ Space = show answer, 1-4 = grade (theory cards) */
  useEffect(() => {
    const onKey = (e) => {
      if (!card || card.kind !== "theory") return;
      if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
      if (!revealed && e.code === "Space") {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) grade(g.grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, grade]);

  /* ================= UI ================= */
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-[22px] font-semibold">Revise 📚</h2>
        <p className="text-gray-600 text-sm">
          Questions come back right before you'd forget them.
        </p>
      </div>
      <select
        value={subject}
        onChange={(e) =>
          setParams(e.target.value ? { subject: e.target.value } : {})
        }
        className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
      >
        <option value="">All subjects</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
            {stats?.due_by_subject[s] ? ` (${stats.due_by_subject[s]})` : ""}
          </option>
        ))}
      </select>
    </div>
  );

  if (!cards) {
    return (
      <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen max-w-[820px] mx-auto">
        {header}
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  /* Nothing due / finished */
  if (!card) {
    const finished = reviewed > 0;
    return (
      <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
        <div className="max-w-[820px] mx-auto">
          {header}
          <div className="bg-white rounded-[18px] shadow px-8 py-10 text-center">
            <div className="text-4xl">{finished ? "🎉" : "✅"}</div>
            <h3 className="text-lg font-semibold mt-3">
              {finished
                ? `Done! You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}.`
                : `Nothing to revise${subject ? ` in ${subject}` : ""} right now.`}
            </h3>
            <p className="text-sm text-gray-600 mt-2 max-w-[460px] mx-auto">
              {finished
                ? "Come back tomorrow, and your next cards will be waiting."
                : "Cards are added automatically when you miss a quiz question or a daily challenge, or bookmark a question as “Revise Later”."}
            </p>
            {stats && (
              <p className="text-sm text-gray-500 mt-4">
                {stats.learning} learning · {stats.mastered} mastered
                {stats.due_tomorrow > 0 && ` · ${stats.due_tomorrow} due tomorrow`}
              </p>
            )}
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => navigate("/quiz")}
                className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm"
              >
                Take a quiz
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white border px-5 py-2 rounded-full text-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Session in progress */
  const progress = (100 * index) / cards.length;

  return (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <div className="max-w-[820px] mx-auto">
        {header}

        {/* progress meter: same-hue track */}
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-600">
          <div className="flex-1 h-2 rounded-full bg-indigo-100 overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular-nums">
            {index + 1} / {cards.length}
          </span>
        </div>

        <div className="bg-white rounded-[18px] shadow px-5 sm:px-7 py-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                {card.subject}
              </span>
              <span className="text-gray-500">{SOURCE_LABEL[card.source] || card.source}</span>
              {card.lapses > 0 && (
                <span className="text-gray-500">· forgotten {card.lapses}×</span>
              )}
            </div>
            <button onClick={removeCard} className="text-gray-400 hover:text-red-600">
              Remove from revision
            </button>
          </div>

          <p className="text-[18px] font-medium mt-4 mb-5">{card.prompt}</p>

          {card.code && (
            <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg px-4 py-3 mb-5 overflow-x-auto">
              <code>{card.code}</code>
            </pre>
          )}

          {card.kind === "theory" ? (
            !revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium"
              >
                Show answer <span className="opacity-60 text-xs ml-1">(Space)</span>
              </button>
            ) : (
              <>
                <div className="bg-indigo-50 rounded-lg px-4 py-3 text-[15px] leading-relaxed">
                  {card.answer}
                </div>
                <p className="text-sm text-gray-600 mt-5 mb-2">How well did you remember it?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g.grade}
                      disabled={busy}
                      onClick={() => grade(g.grade)}
                      className={`border rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50 ${g.cls}`}
                    >
                      {g.label}
                      <span className="block text-xs font-normal opacity-75">
                        {shortDays(card.previews[g.grade])} · key {g.key}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              {card.options.map((opt) => {
                const isCorrect = result && opt === result.correct_answer;
                const isWrongPick = result && opt === selected && !result.correct;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg border transition
                      ${result ? "cursor-default" : "cursor-pointer hover:bg-gray-50"}
                      ${isCorrect ? "border-green-500 bg-green-50" : ""}
                      ${isWrongPick ? "border-red-400 bg-red-50" : ""}
                      ${!result && selected === opt ? "border-indigo-500 bg-indigo-50" : ""}
                      ${!isCorrect && !isWrongPick && !(selected === opt && !result) ? "border-gray-200" : ""}`}
                  >
                    <input
                      type="radio"
                      disabled={!!result}
                      checked={selected === opt}
                      onChange={() => setSelected(opt)}
                    />
                    <span className="text-sm">{opt}</span>
                    {isCorrect && <span className="ml-auto text-green-700 text-xs font-semibold">✔ Correct</span>}
                    {isWrongPick && <span className="ml-auto text-red-600 text-xs font-semibold">✖ Your answer</span>}
                  </label>
                );
              })}

              {!result ? (
                <button
                  onClick={submitMcq}
                  disabled={!selected || busy}
                  className="mt-3 px-6 py-2 rounded-full bg-indigo-600 text-white text-sm disabled:opacity-50"
                >
                  Check
                </button>
              ) : (
                <div className="mt-4">
                  <p className={`font-semibold ${result.correct ? "text-green-700" : "text-red-600"}`}>
                    {result.correct ? "✔ Correct!" : "✖ Not quite."}{" "}
                    <span className="font-normal text-gray-600">
                      Next review in {days(result.next.interval_days)}.
                    </span>
                  </p>
                  {result.explanation && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded-lg px-4 py-3">
                      {result.explanation}
                    </p>
                  )}
                  <button
                    onClick={nextCard}
                    className="mt-4 px-6 py-2 rounded-full bg-indigo-600 text-white text-sm"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
