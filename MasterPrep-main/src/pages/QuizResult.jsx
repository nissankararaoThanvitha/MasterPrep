import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function QuizResult() {
  const navigate = useNavigate();
  const { state } = useLocation();

  /* 🔐 Protect route */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login", { replace: true });
      }
    });

    return () => unsub();
  }, [navigate]);

  /* 🚫 Prevent back navigation */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    window.onpopstate = () => {
      navigate("/quiz", { replace: true });
    };
  }, [navigate]);

  /* ❌ Prevent direct access */
  if (!state) {
    return (
      <div className="p-5 max-w-[900px] mx-auto">
        <h2 className="text-xl font-semibold mb-3">
          No Result Found
        </h2>
        <button
          onClick={() => navigate("/quiz")}
          className="px-[14px] py-[10px] bg-indigo-600 text-white rounded-lg"
        >
          Go to Quiz Page
        </button>
      </div>
    );
  }

  const { score, total, subject, review } = state;

  return (
    <div className="p-5 max-w-[900px] mx-auto">
      {/* Header Card */}
      <div className="bg-white p-4 rounded-[10px] shadow-[0_6px_18px_rgba(0,0,0,0.08)] mb-5">
        <h2 className="text-xl font-semibold">
          {subject} — Quiz Result
        </h2>

        <p className="text-[18px] mt-1">
          Score:{" "}
          <span className="text-indigo-600 font-bold">
            {score}
          </span>{" "}
          / {total}
        </p>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        Review Answers
      </h3>

      {review.map((q, i) => (
        <div
          key={i}
          className="bg-white p-3 rounded-[10px] mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <p className="mb-1">
            <strong>Q{i + 1}.</strong> {q.question}
          </p>

          <p>
            <strong>Your answer: </strong>
            <span
              className={
                q.selected === "Not answered"
                  ? "text-gray-400 font-bold italic"
                  : q.isCorrect
                  ? "text-green-600 font-bold"
                  : "text-red-600 font-bold"
              }
            >
              {q.selected}
            </span>
          </p>

          {!q.isCorrect && (
            <p>
              <strong>Correct answer: </strong>
              <span className="text-green-600 font-bold">
                {q.correct}
              </span>
            </p>
          )}
        </div>
      ))}

      <button
        onClick={() => navigate("/quiz")}
        className="mt-5 px-[14px] py-[10px] bg-indigo-600 text-white rounded-lg"
      >
        Back to Quiz Page
      </button>
    </div>
  );
}
