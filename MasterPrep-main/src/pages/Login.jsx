import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../useAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // On success App.jsx sees the logged-in user and redirects to /dashboard
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6ff] px-4">
      <div className="bg-white p-[30px] rounded-[14px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-full max-w-[350px]">
        <h2 className="text-center mb-[15px] text-xl font-semibold">
          PrepMaster Login
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-[12px]">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-[10px] rounded-lg border border-gray-300"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-[10px] rounded-lg border border-gray-300"
          />

          <button
            type="submit"
            className="p-[10px] rounded-lg bg-indigo-600 text-white"
          >
            Login
          </button>

          <p className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-indigo-600 underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
