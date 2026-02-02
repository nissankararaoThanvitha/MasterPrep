import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // adjust path if needed

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Password match check
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      // 1️⃣ Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 2️⃣ Store extra user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date()
      });

      alert("Account created! Welcome 🎉");
      window.location.href = "/dashboard";
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Account already exists. Please login.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6ff]">
      <div className="bg-white p-[30px] rounded-[14px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[350px]">
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
            <a href="/login" className="text-indigo-600 underline">
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
