import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const questionKey = (subject, id) => `${subject}-${id}`;
const PAGE_SIZE = 10;

function Questions() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openAnswer, setOpenAnswer] = useState(null);

  // key "SUBJECT-id" -> category
  const [bookmarks, setBookmarks] = useState({});
  // key "SUBJECT-id" -> answer text, fetched on first "View"
  const [answers, setAnswers] = useState({});

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });

  /* ⏱️ Wait until the user stops typing before searching */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  /* 📥 Load one page of questions (filtered on the server) */
  useEffect(() => {
    const params = new URLSearchParams({ page: currentPage, page_size: PAGE_SIZE });
    if (subjectFilter !== "All") params.set("subject", subjectFilter);
    if (difficultyFilter !== "All") params.set("difficulty", difficultyFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    let cancelled = false; // ignore responses for outdated filters
    apiFetch(`/questions?${params}`).then((page) => {
      if (!cancelled) setData(page);
    });
    return () => {
      cancelled = true;
    };
  }, [currentPage, subjectFilter, difficultyFilter, debouncedSearch]);

  /* 📥 Load bookmarks */
  useEffect(() => {
    apiFetch("/bookmarks").then((list) =>
      setBookmarks(
        Object.fromEntries(
          list.map((b) => [questionKey(b.subject, b.question_id), b.category])
        )
      )
    );
  }, []);

  /* 👁️ View answer (the server also records it as viewed) */
  const toggleAnswer = async (q) => {
    const key = questionKey(q.subject, q.question_id);
    if (openAnswer === key) {
      setOpenAnswer(null);
      return;
    }

    setOpenAnswer(key);
    if (answers[key]) return;

    const { answer } = await apiFetch(
      `/questions/${q.subject}/${q.question_id}/view`,
      { method: "POST" }
    );
    setAnswers((prev) => ({ ...prev, [key]: answer }));
  };

  /* ⭐ Bookmark (empty category = remove) */
  const handleBookmark = async (q, category) => {
    const key = questionKey(q.subject, q.question_id);

    setBookmarks((prev) => {
      const next = { ...prev };
      if (category) next[key] = category;
      else delete next[key];
      return next;
    });

    if (category) {
      await apiFetch("/bookmarks", {
        method: "PUT",
        body: JSON.stringify({ subject: q.subject, question_id: q.question_id, category }),
      });
    } else {
      await apiFetch(`/bookmarks/${q.subject}/${q.question_id}`, { method: "DELETE" });
    }
  };

  const currentQuestions = data.items;
  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="px-4 sm:px-6 py-5 bg-[#f6f7ff] min-h-screen">
      <h2 className="text-[20px] font-semibold mb-3">
        Question Bank 📚
      </h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search question..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 mb-4 text-sm"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="All">All Subjects</option>
          <option value="DSA">DSA</option>
          <option value="DBMS">DBMS</option>
          <option value="OS">OS</option>
          <option value="CN">CN</option>
          <option value="OOPS">OOPS</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => {
            setDifficultyFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="All">All Difficulty</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {/* Questions */}
      {currentQuestions.length === 0 && (
        <p className="text-gray-500 text-sm">No questions found.</p>
      )}

      {currentQuestions.map((q) => {
        const key = questionKey(q.subject, q.question_id);

        return (
          <div
            key={key}
            className="bg-white px-5 py-4 rounded-xl shadow mb-4"
          >
            <h4 className="text-[15px] font-semibold mb-1">
              {q.title}
            </h4>

            <p className="text-[13px] text-gray-500 mb-3">
              {q.subject} · {q.difficulty}
            </p>

            <div className="flex items-center gap-3">
              <select
                value={bookmarks[key] || ""}
                onChange={(e) => handleBookmark(q, e.target.value)}
                className="px-3 py-1.5 rounded-full border text-[13px]"
              >
                <option value="">⭐ Bookmark</option>
                <option value="Important">Important</option>
                <option value="Revise Later">Revise Later</option>
                <option value="Doubt">Doubt</option>
              </select>

              <button
                onClick={() => toggleAnswer(q)}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[13px]"
              >
                {openAnswer === key ? "Hide" : "View"}
              </button>
            </div>

            {openAnswer === key && (
              <div className="mt-3 bg-indigo-50 px-4 py-3 rounded-lg text-[14px]">
                <b>Answer:</b>
                <p className="mt-1">{answers[key] ?? "Loading…"}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 border bg-white text-sm disabled:opacity-50"
          >
            ← Previous
          </button>

          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 border bg-white text-sm disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default Questions;
