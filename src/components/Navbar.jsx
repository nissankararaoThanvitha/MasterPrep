import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Navbar() {
  const navigate = useNavigate();
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

  return (
    <nav className="flex justify-between items-center px-5 py-3 bg-indigo-600 text-white sticky top-0 z-10">
      <div className="font-bold text-[18px]">PrepMaster</div>

      <div className="flex items-center gap-[14px]">
        <Link className="text-white text-sm no-underline" to="/dashboard">
          Dashboard
        </Link>
        <Link className="text-white text-sm no-underline" to="/questions">
          Questions
        </Link>
        <Link className="text-white text-sm no-underline" to="/quiz">
          Quiz
        </Link>
        <Link className="text-white text-sm no-underline" to="/bookmarks">
          Bookmarks
        </Link>

        {userName && (
          <span className="text-sm opacity-90">
            Hi, {userName}
          </span>
        )}

        <button
          onClick={handleLogout}
          className="ml-[10px] bg-white text-indigo-600 border-none px-[10px] py-[6px] rounded-md cursor-pointer"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
