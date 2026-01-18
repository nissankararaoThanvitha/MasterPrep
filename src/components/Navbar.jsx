import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("prepUser"));

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
    window.location.reload();
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

        <span className="text-sm opacity-90">Hi, {user?.name}</span>

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
