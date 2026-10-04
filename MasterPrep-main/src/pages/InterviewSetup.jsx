import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import ScoreBadge from "../components/ScoreBadge";

const SUBJECTS = ["CN", "DBMS", "DSA", "OOPS", "OS"];
const LENGTHS = [3, 5, 8, 10];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [history, setHistory] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/interviews").then(setHistory);
  }, []);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const session = await apiFetch("/interviews", {
        method: "POST",
        body: JSON.stringify({
          subject: subject || null,
          difficulty: difficulty || null,
          num_questions: numQuestions,
        }),
      });
      navigate(`/interview/${session.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <div className="max-w-[820px] mx-auto">
        <h2 className="text-[22px] font-semibold">Mock interview 🎤</h2>
        <p className="text-gray-600 mt-1 mb-5">
          Answer like you would in a real interview. An AI interviewer grades each
          answer against a model answer and tells you what you missed.
        </p>

        {/* SETUP */}
        <div className="bg-white rounded-[18px] shadow px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Subject</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">Mixed (all subjects)</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">Any</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>
          </div>

          <div className="mt-4 text-sm">
            <span className="block text-gray-600 mb-1">Questions</span>
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNumQuestions(n)}
                  className={`px-4 py-2 ${
                    numQuestions === n ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          <button
            onClick={start}
            disabled={starting}
            className="mt-5 w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60"
          >
            {starting ? "Starting…" : "Start interview 🚀"}
          </button>
        </div>

        {/* HISTORY */}
        <div className="bg-white rounded-[18px] shadow px-6 py-5 mt-5">
          <h3 className="text-[16px] font-semibold mb-2">Past interviews</h3>
          {history.length === 0 && (
            <p className="text-sm text-gray-500">No interviews yet. Your first one is a click away.</p>
          )}
          {history.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 border-b last:border-0"
            >
              <div>
                <p className="font-medium text-sm">
                  {s.subject || "Mixed"}
                  {s.difficulty && <span className="text-gray-500"> · {s.difficulty}</span>}
                  <span className="text-gray-500">
                    {" "}· {s.answered}/{s.num_questions} answered
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.status === "completed" ? (
                  <ScoreBadge score={s.avg_score} />
                ) : (
                  <span className="text-xs text-indigo-600 font-medium">In progress</span>
                )}
                <button
                  onClick={() => navigate(`/interview/${s.id}`)}
                  className="px-3 py-1.5 rounded-md bg-indigo-500 text-white text-sm"
                >
                  {s.status === "completed" ? "Review" : "Resume"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
