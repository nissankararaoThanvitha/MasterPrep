import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function DailyReview() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  /* 🚫 Invalid access */
  if (!state || !state.date) {
    return (
      <div className="p-[30px]">
        <p>No data found.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-2 text-indigo-600"
        >
          Back
        </button>
      </div>
    );
  }

  /* 🔐 Get user + daily solved data */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const solvedMap = snap.data().dailySolvedMap || {};
        setData(solvedMap[state.date] || null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [navigate, state.date]);

  if (loading) {
    return <div className="p-[30px]">Loading...</div>;
  }

  if (!data) {
    return (
      <div className="p-[30px]">
        <p>No solved question for this date.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-2 text-indigo-600"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-[30px] bg-[#f4f5ff] min-h-screen">
      <button
        onClick={() => navigate("/dashboard")}
        className="text-indigo-600 text-[15px]"
      >
        ← Back to Dashboard
      </button>

      <h2 className="mt-[10px] text-xl font-semibold">
        📅 {state.date}
      </h2>
      <h3 className="mt-[8px] text-lg font-medium">
        {data.subject}
      </h3>

      <div className="bg-white p-5 rounded-[14px] mt-5 max-w-[800px]">
        <p className="mb-3">
          <strong>Question:</strong> {data.question}
        </p>

        {data.options.map((opt, i) => (
          <div
            key={i}
            className={`p-[10px] rounded-lg border mb-2 ${
              opt === data.answer
                ? "bg-green-100 border-green-500"
                : "bg-white border-gray-200"
            }`}
          >
            {opt}
          </div>
        ))}

        <p className="mt-3">
          <strong>Correct Answer:</strong> {data.answer}
        </p>

        <p className="mt-[6px]">
          <strong>Explanation:</strong> {data.explanation}
        </p>
      </div>
    </div>
  );
}

export default DailyReview;
