import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import StreakCalendar from "../components/StreakCalendar";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

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

  /* 🔐 Load user + Firestore data */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }

      setUser(u);
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          viewed: [],
          bookmarks: [],
          quizHistory: [],
          dailySolved: [],
          dailySolvedMap: {},
          dailyQuestionMap: {},
        });
        setUserDoc({});
        return;
      }

      const data = snap.data();
      setUserDoc(data);

      setViewedQuestions(data.viewed || []);
      setBookmarks(data.bookmarks || []);
      setQuizCount((data.quizHistory || []).length);

      /* 🏆 Best scores */
      const scores = {};
      (data.quizHistory || []).forEach((q) => {
        if (!scores[q.subject] || q.score > scores[q.subject]) {
          scores[q.subject] = q.score;
        }
      });
      setBestScores(scores);

      /* 🔥 Streak */
      const solved = data.dailySolved || [];
      let s = 0;
      let d = new Date();

      while (solved.includes(d.toDateString())) {
        s++;
        d.setDate(d.getDate() - 1);
      }
      setStreak(s);
    });

    return () => unsub();
  }, [navigate]);

  /* 📅 Load daily question */
  async function loadDailyQuestion(dateStr) {
    if (!user || !userDoc) return;

    const map = userDoc.dailyQuestionMap || {};
    if (map[dateStr]) {
      setQuestion(map[dateStr]);
      return;
    }

    const file = quizFiles[Math.floor(Math.random() * quizFiles.length)];
    const res = await fetch(file);
    const data = await res.json();
    const q = data[Math.floor(Math.random() * data.length)];

    const updatedMap = { ...map, [dateStr]: q };

    await updateDoc(doc(db, "users", user.uid), {
      dailyQuestionMap: updatedMap,
    });

    setUserDoc((p) => ({ ...p, dailyQuestionMap: updatedMap }));
    setQuestion(q);
  }

  /* ✅ Submit daily answer */
  async function submitAnswer() {
    if (!user || !question || selected === null) return;

    const ans = ["a", "b", "c", "d"][selected];
    const today = new Date().toDateString();

    if (ans === question.answer.toLowerCase()) {
      setStatus("correct");

      const solved = userDoc.dailySolved || [];
      const solvedMap = userDoc.dailySolvedMap || {};

      if (!solved.includes(today)) {
        solved.push(today);
        solvedMap[today] = {
          subject: question.subject,
          question: question.question,
          options: question.options,
          answer: question.options[
            ["a", "b", "c", "d"].indexOf(question.answer)
          ],
          explanation: question.explanation,
        };

        await updateDoc(doc(db, "users", user.uid), {
          dailySolved: solved,
          dailySolvedMap: solvedMap,
        });

        setUserDoc((p) => ({
          ...p,
          dailySolved: solved,
          dailySolvedMap: solvedMap,
        }));

        setCalendarRefresh((p) => p + 1);
      }
    } else {
      setStatus("wrong");
    }
  }

  /* 📅 Calendar interactions */
  function handleDateHover(dateStr) {
    if (!dateStr || !userDoc) {
      setHoverQuestion(undefined);
      return;
    }

    setHoverQuestion(userDoc.dailyQuestionMap?.[dateStr] ?? null);
  }

  async function handleDateClick(dateStr) {
    if (new Date(dateStr) > new Date()) return;

    setActiveDate(dateStr);
    setSelected(null);
    setStatus("");
    setShowChallenge(true);
    await loadDailyQuestion(dateStr);
  }

  /* 🏆 Best review */
  function handleBestReview(subject) {
    const history = userDoc?.quizHistory || [];
    const best = history
      .filter((h) => h.subject === subject)
      .sort((a, b) => b.score - a.score)[0];

    if (!best) return;

    navigate("/quiz-result", { state: best });
  }

  /* ================= UI ================= */
  return (
    <div className="px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <div className="grid grid-cols-[3fr_1fr] gap-6">
        {/* LEFT */}
        <div>
          <h2 className="text-[22px] font-semibold">
            Welcome back 👋
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
