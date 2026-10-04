import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import ScoreBadge from "../components/ScoreBadge";

/* Feedback for one answered question */
function Feedback({ q }) {
  const fb = q.feedback || {};
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ScoreBadge score={q.score} size="lg" />
        {q.skipped && <span className="text-sm text-gray-500">Skipped</span>}
      </div>

      {fb.feedback && <p className="text-[15px] leading-relaxed">{fb.feedback}</p>}

      {(fb.covered?.length > 0 || fb.missing?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-green-50 rounded-lg px-4 py-3">
            <p className="font-semibold text-green-800 mb-1">✔ You covered</p>
            {fb.covered?.length ? (
              <ul className="list-disc ml-5 space-y-0.5">
                {fb.covered.map((x) => <li key={x}>{x}</li>)}
              </ul>
            ) : (
              <p className="text-gray-500">None of the key points yet</p>
            )}
          </div>
          <div className="bg-red-50 rounded-lg px-4 py-3">
            <p className="font-semibold text-red-800 mb-1">✖ You missed</p>
            {fb.missing?.length ? (
              <ul className="list-disc ml-5 space-y-0.5">
                {fb.missing.map((x) => <li key={x}>{x}</li>)}
              </ul>
            ) : (
              <p className="text-gray-500">Nothing important 🎉</p>
            )}
          </div>
        </div>
      )}

      {q.answer_text && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600">Your answer</summary>
          <p className="mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3">{q.answer_text}</p>
        </details>
      )}

      <details className="text-sm" open={q.skipped || q.score < 5}>
        <summary className="cursor-pointer text-gray-600">Model answer</summary>
        <p className="mt-2 bg-indigo-50 rounded-lg px-4 py-3 leading-relaxed">{q.reference_answer}</p>
      </details>

      {q.added_to_revision && (
        <p className="text-sm bg-indigo-50 text-indigo-900 rounded-lg px-4 py-2.5">
          📚 Added to your revision queue. It comes back tomorrow, so you can lock it in.
        </p>
      )}

      {fb.follow_up && (
        <p className="text-sm text-gray-700 border-l-4 border-indigo-300 pl-3">
          <span className="font-semibold">An interviewer might ask next:</span> {fb.follow_up}
        </p>
      )}
    </div>
  );
}

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({}); // position -> typed text (kept if grading fails)
  const [grading, setGrading] = useState(false);
  const [showing, setShowing] = useState(null); // position whose feedback is on screen
  const [openSummary, setOpenSummary] = useState(null);

  useEffect(() => {
    apiFetch(`/interviews/${id}`).then(setSession).catch((e) => setError(e.message));
  }, [id]);

  if (error && !session) return <p className="p-6 text-red-600">{error}</p>;
  if (!session) return <p className="p-6 text-gray-500">Loading interview…</p>;

  const total = session.questions.length;
  const title = `${session.subject || "Mixed"}${session.difficulty ? ` · ${session.difficulty}` : ""}`;

  const submit = async (skipped = false) => {
    const position = session.current_position;
    const text = drafts[position] || "";
    if (!skipped && !text.trim()) return;

    setGrading(true);
    setError("");
    try {
      const updated = await apiFetch(`/interviews/${session.id}/answers/${position}`, {
        method: "POST",
        body: JSON.stringify(skipped ? { skipped: true } : { answer: text }),
      });
      setSession(updated);
      setShowing(position);
    } catch (err) {
      setError(err.message); // the draft stays in the box
    } finally {
      setGrading(false);
    }
  };

  const finishEarly = async () => {
    if (!window.confirm("End the interview now? Unanswered questions won't be scored.")) return;
    setSession(await apiFetch(`/interviews/${session.id}/finish`, { method: "POST" }));
    setShowing(null);
  };

  const wrap = (children) => (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <div className="max-w-[820px] mx-auto">{children}</div>
    </div>
  );

  /* ---------- feedback for the question just answered ---------- */
  if (showing !== null) {
    const q = session.questions[showing - 1];
    const done = session.status === "completed";
    return wrap(
      <>
        <p className="text-sm text-gray-500 mb-2">
          Mock interview · {title} · Question {q.position} of {total}
        </p>
        <div className="bg-white rounded-[18px] shadow px-5 sm:px-7 py-6">
          <p className="text-[18px] font-medium mb-5">{q.question}</p>
          <Feedback q={q} />
          <button
            onClick={() => setShowing(null)}
            className="mt-6 px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm"
          >
            {done ? "See results →" : "Next question →"}
          </button>
        </div>
      </>
    );
  }

  /* ---------- summary ---------- */
  if (session.status === "completed") {
    const answered = session.questions.filter((q) => q.answered);
    const toRevise = session.questions.filter((q) => q.added_to_revision).length;
    return wrap(
      <>
        <div className="bg-white rounded-[18px] shadow px-5 sm:px-7 py-6 text-center">
          <p className="text-sm text-gray-500">Mock interview · {title}</p>
          <p className="text-[48px] font-semibold leading-tight mt-2">
            {session.avg_score === null ? "–" : session.avg_score.toFixed(1)}
            <span className="text-xl text-gray-400"> / 10</span>
          </p>
          <div className="mt-2">
            {session.avg_score !== null && <ScoreBadge score={session.avg_score} />}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {answered.length} of {total} questions answered
            {toRevise > 0 &&
              ` · ${toRevise} added to your revision queue`}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {toRevise > 0 && (
              <button
                onClick={() => navigate("/revise")}
                className="bg-white border border-indigo-300 text-indigo-700 px-5 py-2 rounded-full text-sm whitespace-nowrap"
              >
                Revise them
              </button>
            )}
            <button
              onClick={() => navigate("/interview")}
              className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm whitespace-nowrap"
            >
              New interview
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-white border px-5 py-2 rounded-full text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[18px] shadow px-6 py-4 mt-5">
          <h3 className="text-[16px] font-semibold mb-1">Question by question</h3>
          {session.questions.map((q) => (
            <div key={q.position} className="border-b last:border-0 py-3">
              <button
                onClick={() => setOpenSummary(openSummary === q.position ? null : q.position)}
                className="w-full flex items-center justify-between gap-3 text-left"
                disabled={!q.answered}
              >
                <span className="text-sm">
                  <span className="text-gray-400 mr-2">{q.position}.</span>
                  {q.question}
                  <span className="text-gray-400 text-xs ml-2">{q.subject}</span>
                </span>
                <ScoreBadge score={q.answered ? q.score : null} />
              </button>
              {openSummary === q.position && (
                <div className="mt-4 mb-2">
                  <Feedback q={q} />
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ---------- answering ---------- */
  const q = session.questions[session.current_position - 1];
  const draft = drafts[q.position] || "";
  const progress = (100 * (q.position - 1)) / total;

  return wrap(
    <>
      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
        <span>Mock interview · {title}</span>
        <button onClick={finishEarly} className="hover:text-red-600">End interview</button>
      </div>
      <div className="flex items-center gap-3 mb-4 text-sm text-gray-600">
        <div className="flex-1 h-2 rounded-full bg-indigo-100 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="tabular-nums">Question {q.position} of {total}</span>
      </div>

      <div className="bg-white rounded-[18px] shadow px-5 sm:px-7 py-6">
        <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          {q.subject}
        </span>
        <p className="text-[19px] font-medium mt-3 mb-4">🎤 {q.question}</p>

        <textarea
          value={draft}
          disabled={grading}
          onChange={(e) => setDrafts((d) => ({ ...d, [q.position]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          rows={7}
          maxLength={4000}
          placeholder="Explain it as you would to an interviewer: define it, give the key points, add an example if you can…"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[15px] leading-relaxed focus:outline-none focus:border-indigo-400 disabled:bg-gray-50"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Ctrl + Enter to submit</span>
          <span className="tabular-nums">{draft.length}/4000</span>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => submit()}
            disabled={grading || !draft.trim()}
            className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm disabled:opacity-50"
          >
            {grading ? "Grading your answer…" : "Submit answer"}
          </button>
          <button
            onClick={() => submit(true)}
            disabled={grading}
            className="px-5 py-2.5 rounded-full border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            I don't know
          </button>
        </div>
      </div>
    </>
  );
}
