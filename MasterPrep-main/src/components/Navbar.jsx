import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname === "/ai-chat";

  const [userName, setUserName] = useState("");

  /* 🔐 Get logged-in user */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("");
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setUserName(snap.data().name || "");
      }
    });

    return () => unsub();
  }, []);

  /* 🚪 Logout */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  // ✅ Dynamic link color
  const linkClass = `text-sm no-underline ${
    isChatPage ? "text-black" : "text-white"
  } hover:opacity-80`;

  return (
    <nav
      className={`flex justify-between items-center px-5 py-3 sticky top-0 z-10
        ${
          isChatPage
            ? "bg-white text-black border-b border-gray-200"
            : "bg-indigo-600 text-white"
        }`}
    >
      {/* Logo */}
      <div className="font-bold text-[18px]">PrepMaster</div>

      {/* Links */}
      <div className="flex items-center gap-[14px]">
        <Link className={linkClass} to="/dashboard">Dashboard</Link>
        <Link className={linkClass} to="/questions">Questions</Link>
        <Link className={linkClass} to="/quiz">Quiz</Link>
        <Link className={linkClass} to="/bookmarks">Bookmarks</Link>
        <Link className={linkClass} to="/ai-chat">Ask your doubts</Link>

        {userName && (
          <span className="text-sm opacity-90">
            Hi, {userName}
          </span>
        )}

        <button
          onClick={handleLogout}
          className={`ml-[10px] px-[10px] py-[6px] rounded-md cursor-pointer text-sm
            ${
              isChatPage
                ? "bg-black text-white"
                : "bg-white text-indigo-600"
            }`}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
