import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { dateKey, fromKey } from "../dates";
import StreakCalendar from "../components/StreakCalendar";
import WeakestCard from "../components/WeakestCard";

function Dashboard() {
  const navigate = useNavigate();

  const [viewedCount, setViewedCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [attempts, setAttempts] = useState([]);
  // "YYYY-MM-DD" -> { date, question, solved }
  const [challenges, setChallenges] = useState({});
  const [analytics, setAnalytics] = useState(null);

  const [showChallenge, setShowChallenge] = useState(false);
  const [activeDate, setActiveDate] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");

  const [hoverQuestion, setHoverQuestion] = useState(undefined);

  /* 📥 Load progress */
  useEffect(() => {
    apiFetch("/viewed").then((v) => setViewedCount(v.length));
    apiFetch("/bookmarks").then((b) => setBookmarkCount(b.length));
    apiFetch("/quizzes").then(setAttempts);
    apiFetch("/analytics").then(setAnalytics);
    apiFetch("/daily").then((list) =>
      setChallenges(Object.fromEntries(list.map((c) => [c.date, c])))
    );
  }, []);

  const saveChallenge = (c) =>
    setChallenges((prev) => ({ ...prev, [c.date]: c }));

  /* 🏆 Best attempt per subject */
  const bestAttempts = {};
  attempts.forEach((a) => {
    if (!bestAttempts[a.subject] || a.score > bestAttempts[a.subject].score) {
      bestAttempts[a.subject] = a;
    }
  });
  const bestScores = Object.fromEntries(
    Object.entries(bestAttempts).map(([s, a]) => [s, a.score])
  );

  /* 🔥 Streak: consecutive solved days ending today */
  const solvedDates = Object.values(challenges)
    .filter((c) => c.solved)
    .map((c) => c.date);
  let streak = 0;
  for (const d = new Date(); solvedDates.includes(dateKey(d)); d.setDate(d.getDate() - 1)) {
    streak++;
  }

  const question = activeDate ? challenges[activeDate]?.question : null;

  /* 📅 Load (or pick) the question for a date */
  async function loadDailyQuestion(key) {
    if (challenges[key]) return;

    // The server picks the question (and keeps it for that date)
    saveChallenge(await apiFetch(`/daily/${key}`, { method: "PUT" }));
  }

  /* ✅ Submit daily answer (checked by the server) */
  async function submitAnswer() {
    if (!question || selected === null) return;

    const result = await apiFetch(`/daily/${activeDate}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer: ["a", "b", "c", "d"][selected] }),
    });

    setStatus(result.correct ? "correct" : "wrong");
    saveChallenge(result.challenge);
  }

  /* 📅 Calendar interactions */
  function handleDateHover(key) {
    if (!key) {
      setHoverQuestion(undefined);
      return;
    }

    setHoverQuestion(challenges[key]?.question ?? null);
  }

  async function handleDateClick(key) {
    if (fromKey(key) > new Date()) return;

    setActiveDate(key);
    setSelected(null);
    setStatus("");
    setShowChallenge(true);
    await loadDailyQuestion(key);
  }

  /* 🏆 Best review */
  function handleBestReview(subject) {
    const best = bestAttempts[subject];
    if (best) navigate("/quiz-result", { state: best });
  }

  /* ================= UI ================= */
  return (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      {/* one column on phones/tablets, calendar on the right from lg up */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6">
        {/* LEFT */}
        <div>
          <h2 className="text-[22px] font-semibold">
            Welcome back 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Success comes from consistency — not from intensity.
          </p>

          {/* DAILY CHALLENGE */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 sm:px-8 py-6 sm:py-8 rounded-[24px]
                          text-white bg-gradient-to-br from-[#6c63ff] to-[#8f6bff]">
            <div>
              <h3 className="text-[18px] font-semibold">🔥 Daily Challenge</h3>
              <p className="text-sm">Solve 1 question today</p>
            </div>

            <button
              onClick={() => handleDateClick(dateKey())}
              className="bg-white text-black px-6 py-2 rounded-full"
            >
              Start Now
            </button>
          </div>

          {/* REVISE TODAY */}
          {analytics && analytics.totals.revision_due > 0 && (
            <div className="mt-6 bg-white rounded-[16px] shadow px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  📚 Revise today
                </p>
                <p className="text-[17px] font-semibold mt-1">
                  {analytics.totals.revision_due} card
                  {analytics.totals.revision_due === 1 ? "" : "s"} due
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Questions you missed, scheduled right before you'd forget them
                  {analytics.totals.revision_mastered > 0 &&
                    ` · ${analytics.totals.revision_mastered} mastered`}
                </p>
              </div>
              <button
                onClick={() => navigate("/revise")}
                className="shrink-0 bg-indigo-600 text-white px-5 py-2 rounded-full text-sm"
              >
                Start revision
              </button>
            </div>
          )}

          {/* FOCUS AREA */}
          <div className="mt-6">
            <WeakestCard
              weakest={analytics?.weakest}
              dueCount={
                analytics?.subjects.find((s) => s.subject === analytics.weakest?.subject)
                  ?.revision_due
              }
            />
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            {[
              ["Viewed", viewedCount],
              ["Quizzes", attempts.length],
              ["Bookmarks", bookmarkCount],
              ["Streak", `${streak} 🔥`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white px-3 sm:px-5 py-4 rounded-[16px] text-center shadow"
              >
                <div className="text-gray-500 text-sm">{label}</div>
                <div className="text-[18px] font-semibold mt-1">{value}</div>
              </div>
            ))}
          </div>

          {/* BEST SCORES */}
          <div className="bg-white px-5 sm:px-6 py-6 rounded-[18px] mt-7">
            <h3 className="text-[18px] font-semibold mb-4">🏆 Best Scores</h3>

            {Object.keys(bestScores).length === 0 && (
              <p className="text-gray-500 text-sm">
                No quizzes attempted yet
              </p>
            )}

            {Object.keys(bestScores).map((s) => (
              <div key={s} className="py-4 border-b last:border-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s}</p>
                    <p className="text-sm text-gray-600">
                      Score: {bestScores[s]} / {bestAttempts[s].total}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBestReview(s)}
                    className="bg-indigo-500 text-white px-5 py-1.5 rounded-full text-sm"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:sticky lg:top-[90px]">
          <StreakCalendar
            solvedDates={solvedDates}
            onDateHover={handleDateHover}
            onDateClick={handleDateClick}
          />

          {hoverQuestion !== undefined && (
            <div className="mt-3 bg-white p-4 rounded-xl shadow text-sm">
              {hoverQuestion ? (
                <>
                  <b>{hoverQuestion.subject}</b>
                  <p>{hoverQuestion.question}</p>
                </>
              ) : (
                <p className="text-gray-500 italic">
                  Not attempted yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showChallenge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white px-6 sm:px-7 py-6 rounded-[20px] w-full max-w-[440px] max-h-full overflow-y-auto">
            <button
              onClick={() => setShowChallenge(false)}
              className="absolute top-4 right-5 text-xl"
            >
              ✕
            </button>

            {question && (
              <>
                <p className="font-semibold text-lg">{question.subject}</p>
                <p className="my-3">{question.question}</p>
                {question.code && (
                  <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg px-4 py-3 mb-3 overflow-x-auto">
                    <code>{question.code}</code>
                  </pre>
                )}

                {question.options.map((o, i) => (
                  <label key={i} className="flex gap-3 mb-2">
                    <input
                      type="radio"
                      checked={selected === i}
                      onChange={() => {
                        setSelected(i);
                        setStatus("");
                      }}
                    />
                    {o}
                  </label>
                ))}

                {status !== "correct" && (
                  <button
                    onClick={submitAnswer}
                    className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-full"
                  >
                    Submit
                  </button>
                )}

                {status === "wrong" && (
                  <p className="text-red-600 mt-3">✖ Wrong answer</p>
                )}

                {status === "correct" && (
                  <p className="text-green-600 mt-3">✔ Correct</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
