import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function QuizSetup() {
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [history, setHistory] = useState([]);

  const [page, setPage] = useState(1);
  const perPage = 5;

  /* 🔐 Get user + quiz history */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setHistory(snap.data().quizHistory || []);
      }
    });

    return () => unsub();
  }, [navigate]);

  const startQuiz = () => {
    if (!subject) return alert("Select a subject first!");
    navigate(`/quiz/${subject}`);
  };

  const totalPages = Math.ceil(history.length / perPage) || 1;

  const paginatedHistory = history.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className="p-[25px] max-w-[900px] mx-auto">
      {/* Start Quiz Card */}
      <div className="bg-white p-[18px] rounded-[12px] shadow-[0_8px_25px_rgba(0,0,0,0.08)] mb-[25px]">
        <h2 className="text-xl font-semibold mb-1">
          🎯 Start Quiz
        </h2>
        <p className="text-gray-600 mb-3">
          Select a subject. You will get 20 random questions.
        </p>

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full p-[10px] rounded-lg border border-gray-300 mb-[15px]"
        >
          <option value="">Select Subject</option>
          <option value="DBMS">DBMS</option>
          <option value="DSA">DSA</option>
          <option value="OS">OS</option>
          <option value="CN">CN</option>
          <option value="OOPS">OOPS</option>
        </select>

        <button
          onClick={startQuiz}
          className="w-full p-[10px] rounded-lg bg-indigo-600 text-white font-semibold"
        >
          Start Quiz 🚀
        </button>
      </div>

      {/* History Card */}
      <div className="bg-white p-[18px] rounded-[12px] shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold mb-2">
          📜 Attempted Quizzes
        </h3>

        {history.length === 0 && (
          <p className="text-gray-500">
            You have not attempted any quizzes yet.
          </p>
        )}

        {paginatedHistory.map((q, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-[10px] border-b border-gray-200"
          >
            <div>
              <strong>{q.subject}</strong> — {q.date}
              <p className="text-sm">
                Score: {q.score}/{q.total}
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/quiz-result", { state: q })
              }
              className="px-[10px] py-[6px] rounded-md bg-indigo-500 text-white"
            >
              Review
            </button>
          </div>
        ))}

        {history.length > perPage && (
          <div className="flex justify-between items-center mt-[15px]">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-[10px] py-[6px] rounded-md border bg-white disabled:opacity-50"
            >
              ← Previous
            </button>

            <span className="font-semibold">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-[10px] py-[6px] rounded-md border bg-white disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizSetup;
