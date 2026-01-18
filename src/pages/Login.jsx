import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    const storedUser = JSON.parse(localStorage.getItem("prepUser"));

    if (!storedUser) {
      setError("No account found. Please register first.");
      return;
    }

    if (storedUser.email === email && storedUser.password === password) {
      localStorage.setItem("currentUser", JSON.stringify(storedUser));
      localStorage.setItem("isLoggedIn", "true");
      window.location.href = "/dashboard";
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6ff]">
      <div className="bg-white p-[30px] rounded-[14px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[350px]">
        <h2 className="text-center mb-[15px] text-xl font-semibold">
          PrepMaster Login
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-[12px]"
        >
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
            className="p-[10px] rounded-lg bg-indigo-600 text-white cursor-pointer"
          >
            Login
          </button>

          <p className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="text-indigo-600 underline"
            >
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
