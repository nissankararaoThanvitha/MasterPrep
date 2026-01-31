import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Quiz() {
  const navigate = useNavigate();
  const { subject } = useParams();

  const [user, setUser] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [review, setReview] = useState([]);
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(600);

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  /* 🔐 Get logged-in user */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsub();
  }, [navigate]);

  /* ---------------- LOAD QUIZ ---------------- */
  useEffect(() => {
    const loadQuiz = async () => {
      const res = await fetch(`/${subject.toLowerCase()}_quiz.json`);
      const data = await res.json();
      setQuestions(shuffle(data).slice(0, 20));
      setLoading(false);
    };
    loadQuiz();
  }, [subject]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!questions.length) return;

    if (timeLeft === 0) {
      handleSubmit();
      return;
    }

    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, questions]);

  /* ---------------- PREVENT BACK ---------------- */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      navigate("/dashboard", { replace: true });
    };
  }, [navigate]);

  /* ---------------- RESTORE SELECTED OPTION ---------------- */
  useEffect(() => {
    if (review[currentIndex]) {
      setSelected(review[currentIndex].selected);
    } else {
      setSelected("");
    }
  }, [currentIndex, review]);

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /* ---------------- SUBMIT QUIZ ---------------- */
  const handleSubmit = async () => {
    if (!user) return;

    let updatedReview = [...review];
    let finalScore = 0;

    questions.forEach((q, index) => {
      const answerIndex = ["a", "b", "c", "d"].indexOf(q.answer);
      const correctText = q.options[answerIndex];

      if (!updatedReview[index]) {
        updatedReview[index] = {
          question: q.question,
          options: q.options,
          selected: "Not answered",
          correct: correctText,
          isCorrect: false,
        };
      }

      if (updatedReview[index].isCorrect) finalScore++;
    });

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    const previousHistory = snap.exists()
      ? snap.data().quizHistory || []
      : [];

    const updatedHistory = [
      {
        date: new Date().toLocaleString(),
        subject,
        score: finalScore,
        total: 20,
        review: updatedReview,
      },
      ...previousHistory,
    ];

    await updateDoc(ref, {
      quizHistory: updatedHistory,
    });

    navigate("/quiz-result", {
      state: {
        score: finalScore,
        total: 20,
        subject,
        review: updatedReview,
      },
    });
  };

  /* ---------------- NEXT ---------------- */
  const handleNext = () => {
    if (!selected) return alert("Please choose an option!");

    const q = questions[currentIndex];
    const answerIndex = ["a", "b", "c", "d"].indexOf(q.answer);
    const correctText = q.options[answerIndex];

    const reviewItem = {
      question: q.question,
      options: q.options,
      selected,
      correct: correctText,
      isCorrect: selected === correctText,
    };

    const updated = [...review];
    updated[currentIndex] = reviewItem;
    setReview(updated);

    if (currentIndex === 19) {
      handleSubmit();
    } else {
      setCurrentIndex((p) => p + 1);
    }
  };

  /* ---------------- PREVIOUS ---------------- */
  const handlePrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((p) => p - 1);
  };

  if (loading) return <p className="p-6">Loading quiz...</p>;

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
          {subject.toUpperCase()} · Question {currentIndex + 1} / 20
        </h3>

        <p className="text-[16px] font-medium mb-4">
          {q.question}
        </p>

        {/* OPTIONS */}
        {q.options.map((opt, i) => {
          const isSelected = selected === opt;

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
                onChange={() => setSelected(opt)}
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
            {currentIndex === 19 ? "Submit Quiz" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Quiz;
