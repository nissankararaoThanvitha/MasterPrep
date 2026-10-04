import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { fromKey } from "../dates";
import WeakestCard from "../components/WeakestCard";
import SubjectBars from "../components/charts/SubjectBars";
import TrendLine from "../components/charts/TrendLine";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const shortDate = (key) =>
  fromKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function StatTile({ label, value, sub }) {
  return (
    <div className="bg-white px-5 py-4 rounded-[16px] shadow">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="text-[22px] font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/analytics").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-gray-500">Loading progress…</p>;

  const { totals, subjects, weekly, weakest } = data;
  const highlight = weakest?.reason === "lowest_accuracy" ? weakest.subject : null;

  const accuracyRows = subjects.map((s) => ({
    subject: s.subject,
    value: s.accuracy,
    note: s.quizzes ? `${s.correct}/${s.answered} · ${plural(s.quizzes, "quiz")}` : "",
    tooltip: s.quizzes
      ? `${s.subject}: ${s.accuracy}% correct · best quiz ${s.best_score}%`
      : null,
  }));

  const coverageRows = subjects.map((s) => ({
    subject: s.subject,
    value: s.bank_total ? (100 * s.viewed) / s.bank_total : null,
    note: `${s.viewed}/${s.bank_total} viewed`,
    tooltip: `${s.subject}: ${s.viewed} of ${s.bank_total} answers viewed`,
  }));

  const interviewRows = subjects.map((s) => ({
    subject: s.subject,
    value: s.interview_avg === null ? null : s.interview_avg * 10, // 0-10 drawn on a 0-100 bar
    note: s.interview_answers ? plural(s.interview_answers, "answer") : "",
    tooltip: s.interview_answers
      ? `${s.subject}: ${s.interview_avg}/10 average over ${plural(s.interview_answers, "answer")}`
      : null,
  }));

  const trendPoints = weekly.map((w) => ({
    label: shortDate(w.week_start),
    value: w.accuracy,
    tooltip: w.quizzes
      ? `Week of ${shortDate(w.week_start)}: ${w.accuracy}% · ${plural(w.quizzes, "quiz")}`
      : `Week of ${shortDate(w.week_start)}: no quizzes`,
  }));

  return (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <h2 className="text-[22px] font-semibold">Your progress 📈</h2>
      <p className="text-gray-600 mt-1 mb-5">
        Where you're strong, where to focus next.
      </p>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatTile
          label="Quiz accuracy"
          value={totals.accuracy === null ? "–" : `${Math.round(totals.accuracy)}%`}
          sub={plural(totals.quizzes, "quiz") + " taken"}
        />
        <StatTile
          label="Question bank viewed"
          value={`${Math.round((100 * totals.viewed) / (totals.bank_total || 1))}%`}
          sub={`${totals.viewed} of ${totals.bank_total} answers`}
        />
        <StatTile
          label="Mock interview average"
          value={totals.interview_avg === null ? "–" : `${totals.interview_avg}/10`}
          sub={plural(totals.interviews, "interview") + " completed"}
        />
        <StatTile
          label="Daily challenges solved"
          value={totals.daily_solved}
        />
        <StatTile
          label="Longest streak"
          value={plural(totals.longest_streak, "day")}
        />
      </div>

      <div className="mt-5">
        <WeakestCard
          weakest={weakest}
          dueCount={subjects.find((s) => s.subject === weakest?.subject)?.revision_due}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Accuracy by subject */}
        <div className="bg-white rounded-[18px] px-6 py-5 shadow">
          <h3 className="text-[16px] font-semibold">Quiz accuracy by subject</h3>
          <p className="text-xs text-gray-500 mb-4">
            Share of quiz questions answered correctly
            {highlight && " · weakest highlighted"}
          </p>
          <SubjectBars rows={accuracyRows} highlight={highlight} emptyText="No quizzes yet" />
        </div>

        {/* Weekly trend */}
        <div className="bg-white rounded-[18px] px-6 py-5 shadow">
          <h3 className="text-[16px] font-semibold">Weekly quiz accuracy</h3>
          <p className="text-xs text-gray-500 mb-2">Last 8 weeks</p>
          {totals.quizzes === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              Take your first quiz to see your trend.
            </p>
          ) : (
            <TrendLine points={trendPoints} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Interview scores */}
        <div className="bg-white rounded-[18px] px-6 py-5 shadow">
          <h3 className="text-[16px] font-semibold">Mock interview score by subject</h3>
          <p className="text-xs text-gray-500 mb-4">Average AI grade per answer, out of 10</p>
          <SubjectBars
            rows={interviewRows}
            emptyText="No interview answers yet"
            format={(v) => `${(v / 10).toFixed(1)}/10`}
          />
        </div>

        {/* Coverage */}
        <div className="bg-white rounded-[18px] px-6 py-5 shadow">
          <h3 className="text-[16px] font-semibold">Question bank coverage</h3>
          <p className="text-xs text-gray-500 mb-4">Answers you've opened, per subject</p>
          <SubjectBars rows={coverageRows} />
        </div>
      </div>
    </div>
  );
}
