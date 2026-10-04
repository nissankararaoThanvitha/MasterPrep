import { useNavigate } from "react-router-dom";

/* "Focus area" call-to-action built from /analytics `weakest`. */
export default function WeakestCard({ weakest, dueCount = 0 }) {
  const navigate = useNavigate();
  if (!weakest) return null;

  const { subject, reason, accuracy } = weakest;
  const notStarted = reason === "not_started";

  return (
    <div className="bg-white rounded-[16px] shadow px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          🎯 Focus area
        </p>
        <p className="text-[17px] font-semibold mt-1">
          {notStarted
            ? `You haven't tried ${subject} yet`
            : `${subject} is your weakest subject`}
        </p>
        <p className="text-sm text-gray-600 mt-0.5">
          {notStarted
            ? "Take a quiz to see where you stand."
            : `${Math.round(accuracy)}% accuracy in quizzes so far.`}
        </p>
      </div>

      <button
        onClick={() =>
          navigate(dueCount > 0 ? `/revise?subject=${subject}` : `/quiz/${subject}`)
        }
        className="shrink-0 bg-indigo-600 text-white px-5 py-2 rounded-full text-sm"
      >
        {notStarted
          ? `Start ${subject} quiz`
          : dueCount > 0
            ? `Revise ${subject} (${dueCount} due)`
            : `Practice ${subject}`}
      </button>
    </div>
  );
}
