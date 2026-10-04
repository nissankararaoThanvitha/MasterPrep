import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [openAnswer, setOpenAnswer] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  /* 📥 Load bookmarks (the server includes each question's title + answer) */
  useEffect(() => {
    apiFetch("/bookmarks").then((list) =>
      setBookmarks(list.map((b) => ({ ...b, key: `${b.subject}-${b.question_id}` })))
    );
  }, []);

  /* ❌ Remove bookmark */
  const removeBookmark = async (b) => {
    setBookmarks((prev) => prev.filter((x) => x.key !== b.key));
    await apiFetch(`/bookmarks/${b.subject}/${b.question_id}`, {
      method: "DELETE",
    });
  };

  /* 🔍 Filters */
  const filtered = bookmarks
    .filter((b) =>
      (b.title || "").toLowerCase().includes(search.toLowerCase())
    )
    .filter((b) =>
      filterCategory === "All" ? true : b.category === filterCategory
    );

  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const current = filtered.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold mb-3">
        ⭐ Bookmarked Questions ({filtered.length})
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-[10px] mb-3">
        <input
          type="text"
          placeholder="Search bookmarks…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 p-2 rounded-lg border border-gray-300"
        />

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 rounded-lg border border-gray-300"
        >
          <option value="All">All</option>
          <option value="Important">Important</option>
          <option value="Revise Later">Revise Later</option>
          <option value="Doubt">Doubt</option>
        </select>
      </div>

      {current.length === 0 && (
        <p className="text-gray-500">No bookmarks found.</p>
      )}

      {/* Cards */}
      {current.map((b) => (
        <div
          key={b.key}
          className="bg-white p-[14px] rounded-[10px] shadow-[0_5px_18px_rgba(0,0,0,0.08)] mt-[10px]"
        >
          <h4 className="font-semibold">{b.title}</h4>

          <p className="text-sm mt-1">
            Subject: <b>{b.subject || "Unknown"}</b>
          </p>

          <div className="flex flex-wrap justify-between items-center gap-2 mt-[6px]">
            <span className="bg-sky-100 px-[10px] py-[4px] rounded-full text-[12px]">
              {b.category}
            </span>

            <div className="flex gap-[10px]">
              <button
                onClick={() =>
                  setOpenAnswer(openAnswer === b.key ? null : b.key)
                }
                className="bg-indigo-600 text-white px-[12px] py-[6px] rounded-lg text-sm"
              >
                {openAnswer === b.key ? "Hide Answer" : "View Answer"}
              </button>

              <button
                onClick={() => removeBookmark(b)}
                className="bg-red-600 text-white px-[12px] py-[6px] rounded-lg text-sm"
              >
                Remove
              </button>
            </div>
          </div>

          {openAnswer === b.key && (
            <div className="mt-[10px] bg-indigo-50 p-3 rounded-lg">
              <b>Answer:</b>
              <p>{b.answer}</p>
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      <div className="mt-[15px] flex justify-between items-center">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-[10px] py-[6px] rounded-md border bg-white disabled:opacity-50"
        >
          ← Previous
        </button>

        <span className="font-semibold">
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-[10px] py-[6px] rounded-md border bg-white disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Bookmarks;
