import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";

function Quiz() {
  const navigate = useNavigate();
  const { subject } = useParams();

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]); // served WITHOUT answers
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null); // option index on screen
  const [answers, setAnswers] = useState({}); // question_id -> option index
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(600);
  const submitted = useRef(false);
  const started = useRef(false);

  /* ---------------- START QUIZ (the server picks the questions) ---------------- */
  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;

    apiFetch("/quizzes/start", {
      method: "POST",
      body: JSON.stringify({ subject: subject.toUpperCase() }),
    })
      .then((s) => {
        setSessionId(s.session_id);
        setQuestions(s.questions);
        setTimeLeft(s.time_limit_seconds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject]);

  /* ---------------- PREVENT BACK ---------------- */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      navigate("/dashboard", { replace: true });
    };
  }, [navigate]);

  /* Move to a question, restoring any option already chosen there */
  const goTo = (index, answerMap = answers) => {
    setCurrentIndex(index);
    setSelected(answerMap[questions[index].question_id] ?? null);
  };

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /* ---------------- SUBMIT QUIZ (graded on the server) ---------------- */
  // `latestAnswers` lets handleNext pass in the answer it just recorded:
  // the `answers` state won't have updated yet at that point.
  const handleSubmit = useCallback(async (latestAnswers = answers) => {
    if (submitted.current || !sessionId) return; // timer and button can both fire
    submitted.current = true;

    try {
      const attempt = await apiFetch("/quizzes", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          answers: Object.entries(latestAnswers).map(([id, sel]) => ({
            question_id: Number(id),
            selected: sel,
          })),
        }),
      });
      navigate("/quiz-result", { state: attempt });
    } catch (err) {
      submitted.current = false;
      alert(`Could not save your quiz: ${err.message}`);
    }
  }, [answers, sessionId, navigate]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!questions.length) return;

    if (timeLeft === 0) {
      handleSubmit();
      return;
    }

    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, questions, handleSubmit]);

  /* ---------------- NEXT ---------------- */
  const handleNext = () => {
    if (selected === null) return alert("Please choose an option!");

    const updated = { ...answers, [questions[currentIndex].question_id]: selected };
    setAnswers(updated);

    if (currentIndex === questions.length - 1) {
      handleSubmit(updated);
    } else {
      goTo(currentIndex + 1, updated);
    }
  };

  /* ---------------- PREVIOUS ---------------- */
  const handlePrev = () => {
    if (currentIndex === 0) return;
    goTo(currentIndex - 1);
  };

  if (loading) return <p className="p-6">Loading quiz...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  const q = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#f4f5ff] flex flex-col items-center pt-4">
      {/* TIMER */}
      <div className="w-full max-w-[780px] flex justify-end mb-3 px-3">
        <div
          className={`bg-white px-4 py-1.5 rounded-lg shadow text-sm font-semibold ${
            timeLeft <= 60 ? "text-red-600" : "text-gray-800"
          }`}
        >
          ⏳ {formatTime()}
        </div>
      </div>

      {/* QUIZ CARD */}
      <div className="bg-white w-full max-w-[780px] rounded-xl shadow px-6 py-5">
        <h3 className="text-sm font-semibold text-gray-600 mb-1">
          {subject.toUpperCase()} · Question {currentIndex + 1} / {questions.length}
        </h3>

        <p className="text-[16px] font-medium mb-4">
          {q.question}
        </p>

        {q.code && (
          <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg px-4 py-3 mb-4 overflow-x-auto">
            <code>{q.code}</code>
          </pre>
        )}

        {/* OPTIONS */}
        {q.options.map((opt, i) => {
          const isSelected = selected === i;

          return (
            <label
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg border cursor-pointer transition
                ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
            >
              <input
                type="radio"
                checked={isSelected}
                onChange={() => setSelected(i)}
              />
              <span className="text-sm">{opt}</span>
            </label>
          );
        })}

        {/* ACTIONS */}
        <div className="flex justify-between mt-5">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="px-4 py-2 rounded-md text-sm bg-gray-300 text-gray-700 font-medium disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-md text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {currentIndex === questions.length - 1 ? "Submit Quiz" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Quiz;
