import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StreakCalendar from "../components/StreakCalendar";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("currentUser"));
  const email = user?.email;

  const [viewedQuestions, setViewedQuestions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [quizCount, setQuizCount] = useState(0);
  const [bestScores, setBestScores] = useState({});
  const [streak, setStreak] = useState(0);

  const [showChallenge, setShowChallenge] = useState(false);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");

  const [hoverQuestion, setHoverQuestion] = useState(undefined);
  const [activeDate, setActiveDate] = useState(null);
  const [calendarRefresh, setCalendarRefresh] = useState(0);

  const quizFiles = [
    "/cn_quiz.json",
    "/dbms_quiz.json",
    "/dsa_quiz.json",
    "/oops_quiz.json",
    "/os_quiz.json",
  ];

  const getStreakKey = () => `dailyStreak_${email}`;
  const getSolvedListKey = () => `dailySolvedList_${email}`;
  const getQuestionMapKey = () => `dailyQuestionMap_${email}`;

  /* ---------------- DAILY QUESTION ---------------- */
  async function loadDailyQuestion(dateStr) {
    const mapKey = getQuestionMapKey();
    const questionMap = JSON.parse(localStorage.getItem(mapKey)) || {};

    if (questionMap[dateStr]) {
      setQuestion(questionMap[dateStr]);
      return;
    }

    const file = quizFiles[Math.floor(Math.random() * quizFiles.length)];
    const res = await fetch(file);
    const data = await res.json();
    const q = data[Math.floor(Math.random() * data.length)];

    questionMap[dateStr] = q;
    localStorage.setItem(mapKey, JSON.stringify(questionMap));
    setQuestion(q);
  }

  /* ---------------- STREAK ---------------- */
  function updateStreak() {
    const today = new Date().toDateString();

    let streakData =
      JSON.parse(localStorage.getItem(getStreakKey())) || {
        streak: 0,
        lastDate: null,
      };

    let solvedList =
      JSON.parse(localStorage.getItem(getSolvedListKey())) || [];

    if (streakData.lastDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    streakData.streak =
      streakData.lastDate === yesterday.toDateString()
        ? streakData.streak + 1
        : 1;

    streakData.lastDate = today;
    localStorage.setItem(getStreakKey(), JSON.stringify(streakData));

    if (!solvedList.includes(today)) {
      solvedList.push(today);
      localStorage.setItem(getSolvedListKey(), JSON.stringify(solvedList));
    }

    setStreak(streakData.streak);
    setCalendarRefresh((p) => p + 1);
  }

  /* ---------------- ANSWER LOGIC ---------------- */
  function submitAnswer() {
    if (selected === null || !question) return;

    const ans = ["a", "b", "c", "d"][selected];

    if (ans === question.answer.toLowerCase()) {
      setStatus("correct");
      if (activeDate === new Date().toDateString()) {
        updateStreak();
      }
    } else {
      setStatus("wrong");
    }
  }

  /* ---------------- CALENDAR ---------------- */
  function handleDateHover(dateStr) {
    if (!dateStr) {
      setHoverQuestion(undefined);
      return;
    }

    const map = JSON.parse(localStorage.getItem(getQuestionMapKey())) || {};
    setHoverQuestion(map[dateStr] ?? null);
  }

  async function handleDateClick(dateStr) {
    const today = new Date().toDateString();
    if (new Date(dateStr) > new Date(today)) return;

    setActiveDate(dateStr);
    setSelected(null);
    setStatus("");
    setShowChallenge(true);
    await loadDailyQuestion(dateStr);
  }

  /* ---------------- BEST REVIEW (✅ FIX) ---------------- */
  function handleBestReview(subject) {
    const history =
      JSON.parse(localStorage.getItem(`quizHistory_${email}`)) || [];

    const bestAttempt = history
      .filter((h) => h.subject === subject)
      .sort((a, b) => b.score - a.score)[0];

    if (!bestAttempt) return;

    navigate("/quiz-result", {
      state: {
        score: bestAttempt.score,
        total: bestAttempt.total,
        subject: bestAttempt.subject,
        review: bestAttempt.review,
      },
    });
  }

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (!email) return;

    setViewedQuestions(
      JSON.parse(localStorage.getItem(`viewedQuestions_${email}`)) || []
    );
    setBookmarks(
      JSON.parse(localStorage.getItem(`bookmarks_${email}`)) || []
    );

    const history =
      JSON.parse(localStorage.getItem(`quizHistory_${email}`)) || [];
    setQuizCount(history.length);

    const scores = {};
    history.forEach((q) => {
      if (!scores[q.subject] || q.score > scores[q.subject]) {
        scores[q.subject] = q.score;
      }
    });
    setBestScores(scores);

    const streakData =
      JSON.parse(localStorage.getItem(getStreakKey())) || null;
    if (streakData) setStreak(streakData.streak);
  }, [email]);

  /* ================= UI ================= */
  return (
    <div className="px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <div className="grid grid-cols-[3fr_1fr] gap-6">
        {/* LEFT */}
        <div>
          <h2 className="text-[22px] font-semibold">
            Welcome back, {user?.name} 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Success comes from consistency — not from intensity.
          </p>

          {/* DAILY CHALLENGE */}
          <div className="mt-4 flex items-center justify-between px-8 py-8 rounded-[24px]
                          text-white bg-gradient-to-br from-[#6c63ff] to-[#8f6bff]">
            <div>
              <h3 className="text-[18px] font-semibold">🔥 Daily Challenge</h3>
              <p className="text-sm">Solve 1 question today</p>
            </div>

            <button
              onClick={() => handleDateClick(new Date().toDateString())}
              className="bg-white text-black px-6 py-2 rounded-full"
            >
              Start Now
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              ["Viewed", viewedQuestions.length],
              ["Quizzes", quizCount],
              ["Bookmarks", bookmarks.length],
              ["Streak", `${streak} 🔥`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white px-5 py-4 rounded-[16px] text-center shadow"
              >
                <div className="text-gray-500 text-sm">{label}</div>
                <div className="text-[18px] font-semibold mt-1">{value}</div>
              </div>
            ))}
          </div>

          {/* BEST SCORES */}
          <div className="bg-white px-6 py-6 rounded-[18px] mt-7">
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
                      Score: {bestScores[s]} / 20
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
        <div className="sticky top-[90px]">
          <StreakCalendar
            email={email}
            refresh={calendarRefresh}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="relative bg-white px-7 py-6 rounded-[20px] w-[440px]">
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
