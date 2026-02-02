import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import dbms from "../data/dbms.json";
import dsa from "../data/dsa.json";
import os from "../data/os.json";
import cn from "../data/cn.json";
import oops from "../data/oops.json";

function Questions() {
  const allQuestions = [...dbms, ...dsa, ...os, ...cn, ...oops];

  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [openAnswer, setOpenAnswer] = useState(null);

  const [bookmarks, setBookmarks] = useState([]);
  const [viewed, setViewed] = useState([]);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;

  /* 🔐 Get logged-in user */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setBookmarks(snap.data().bookmarks || []);
          setViewed(snap.data().viewed || []);
        } else {
          await setDoc(ref, { bookmarks: [], viewed: [] });
        }
      }
    });

    return () => unsub();
  }, []);

  /* 👁️ View answer */
  const toggleAnswer = async (id) => {
    setOpenAnswer(openAnswer === id ? null : id);

    if (!user || viewed.includes(id)) return;

    const updated = [...viewed, id];
    setViewed(updated);

    await updateDoc(doc(db, "users", user.uid), {
      viewed: updated,
    });
  };

  /* ⭐ Bookmark */
  const handleBookmark = async (id, title, category, answer, subject) => {
    if (!user) return;

    const updated = [
      ...bookmarks.filter((b) => b.id !== id),
      { id, title, category, answer, subject },
    ];

    setBookmarks(updated);

    await updateDoc(doc(db, "users", user.uid), {
      bookmarks: updated,
    });
  };

  /* 🔍 Filtering */
  const filtered = allQuestions
    .filter((q) =>
      ((q.question || q.title || "") + "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .filter((q) =>
      subjectFilter === "All" ? true : q.subject === subjectFilter
    )
    .filter((q) =>
      difficultyFilter === "All"
        ? true
        : q.difficulty === difficultyFilter
    );

  const indexOfLast = currentPage * questionsPerPage;
  const indexOfFirst = indexOfLast - questionsPerPage;
  const currentQuestions = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / questionsPerPage);

  return (
    <div className="px-6 py-5 bg-[#f6f7ff] min-h-screen">
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
      {currentQuestions.map((q) => (
        <div
          key={q.id}
          className="bg-white px-5 py-4 rounded-xl shadow mb-4"
        >
          <h4 className="text-[15px] font-semibold mb-1">
            {q.question || q.title}
          </h4>

          <p className="text-[13px] text-gray-500 mb-3">
            {q.subject} · {q.difficulty}
          </p>

          <div className="flex items-center gap-3">
            <select
              value={bookmarks.find((b) => b.id === q.id)?.category || ""}
              onChange={(e) =>
                handleBookmark(
                  q.id,
                  q.question || q.title,
                  e.target.value,
                  q.answer,
                  q.subject
                )
              }
              className="px-3 py-1.5 rounded-full border text-[13px]"
            >
              <option value="">⭐ Bookmark</option>
              <option value="Important">Important</option>
              <option value="Revise Later">Revise Later</option>
              <option value="Doubt">Doubt</option>
            </select>

            <button
              onClick={() => toggleAnswer(q.id)}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[13px]"
            >
              {openAnswer === q.id ? "Hide" : "View"}
            </button>
          </div>

          {openAnswer === q.id && (
            <div className="mt-3 bg-indigo-50 px-4 py-3 rounded-lg text-[14px]">
              <b>Answer:</b>
              <p className="mt-1">{q.answer}</p>
            </div>
          )}
        </div>
      ))}

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
