import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../useAuth";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const { register } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Password match check
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    try {
      // On success App.jsx sees the logged-in user and redirects to /dashboard
      await register(name, email, password);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6ff] px-4">
      <div className="bg-white p-[30px] rounded-[14px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-full max-w-[350px]">
        <h2 className="text-center mb-[15px] text-xl font-semibold">
          Create Account
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-[12px]">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="p-[10px] rounded-lg border border-gray-300"
          />

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

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="p-[10px] rounded-lg border border-gray-300"
          />

          <button
            type="submit"
            className="p-[10px] rounded-lg bg-indigo-600 text-white font-semibold"
          >
            Register
          </button>

          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
