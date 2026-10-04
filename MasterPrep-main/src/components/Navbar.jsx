import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../useAuth";

const LINKS = [
  ["/dashboard", "Dashboard"],
  ["/questions", "Questions"],
  ["/quiz", "Quiz"],
  ["/interview", "Mock Interview"],
  ["/revise", "Revise"],
  ["/progress", "Progress"],
  ["/bookmarks", "Bookmarks"],
  ["/ai-chat", "Ask your doubts"],
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname === "/ai-chat";
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const userName = user?.name || "";

  /* Close the mobile menu whenever the page changes */
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  /* Escape closes the mobile menu */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  /* 🚪 Logout */
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  // ✅ Dynamic colors (the chat page uses a light navbar)
  const linkClass = (to) =>
    `text-sm no-underline hover:opacity-80 ${
      isChatPage ? "text-black" : "text-white"
    } ${isActive(to) ? "font-semibold underline underline-offset-4" : ""}`;

  const logoutClass = `px-[10px] py-[6px] rounded-md cursor-pointer text-sm ${
    isChatPage ? "bg-black text-white" : "bg-white text-indigo-600"
  }`;

  return (
    <nav
      className={`sticky top-0 z-30 ${
        isChatPage
          ? "bg-white text-black border-b border-gray-200"
          : "bg-indigo-600 text-white"
      }`}
    >
      <div className="h-14 flex justify-between items-center px-4 sm:px-5">
        {/* Logo */}
        <Link to="/dashboard" className="font-bold text-[18px] no-underline">
          PrepMaster
        </Link>

        {/* Desktop: full row of links */}
        <div className="hidden lg:flex items-center gap-[14px]">
          {LINKS.map(([to, label]) => (
            <Link key={to} className={linkClass(to)} to={to}>
              {label}
            </Link>
          ))}
          {userName && <span className="text-sm opacity-90">Hi, {userName}</span>}
          <button onClick={handleLogout} className={`ml-[10px] ${logoutClass}`}>
            Logout
          </button>
        </div>

        {/* Mobile / tablet: menu button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-md text-2xl hover:opacity-80"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile / tablet: dropdown menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className={`lg:hidden border-t px-4 pb-4 pt-2 shadow-lg ${
            isChatPage ? "bg-white border-gray-200" : "bg-indigo-600 border-indigo-500"
          }`}
        >
          {userName && <p className="text-sm opacity-80 py-2">Hi, {userName}</p>}
          <div className="flex flex-col">
            {LINKS.map(([to, label]) => (
              <Link key={to} className={`${linkClass(to)} py-2.5 text-[15px]`} to={to}>
                {label}
              </Link>
            ))}
          </div>
          <button onClick={handleLogout} className={`mt-3 w-full ${logoutClass}`}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
