import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
import Questions from "./pages/Questions";
import Bookmarks from "./pages/Bookmarks";
import QuizSetup from "./pages/QuizSetup";
import Quiz from "./pages/Quiz";
import QuizResult from "./pages/QuizResult";
import DailyReview from "./pages/DailyReview";
import AIDoubtChat from "./pages/AIDoubtChat";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      {/* Show navbar only when logged in */}
      {isLoggedIn && <Navbar />}

      <Routes>
        {/* Public pages */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <Register />}
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />

        {/* Protected pages */}
        <Route
          path="/dashboard"
          element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/questions"
          element={isLoggedIn ? <Questions /> : <Navigate to="/login" />}
        />

        <Route
          path="/bookmarks"
          element={isLoggedIn ? <Bookmarks /> : <Navigate to="/login" />}
        />

        {/* QUIZ FLOW */}
        <Route
          path="/quiz"
          element={isLoggedIn ? <QuizSetup /> : <Navigate to="/login" />}
        />

        <Route
          path="/quiz/:subject"
          element={isLoggedIn ? <Quiz /> : <Navigate to="/login" />}
        />

        <Route
          path="/quiz-result"
          element={isLoggedIn ? <QuizResult /> : <Navigate to="/login" />}
        />

        <Route
          path="/daily-review"
          element={isLoggedIn ? <DailyReview /> : <Navigate to="/login" />}
        />

        <Route path="/ai-chat" element={<AIDoubtChat />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
