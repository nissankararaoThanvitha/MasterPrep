import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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

function App() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");

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
        {/* 1️⃣ choose subject */}
        <Route
          path="/quiz"
          element={isLoggedIn ? <QuizSetup /> : <Navigate to="/login" />}
        />

        {/* 2️⃣ quiz starts */}
        <Route
          path="/quiz/:subject"
          element={isLoggedIn ? <Quiz /> : <Navigate to="/login" />}
        />

        {/* 3️⃣ result */}
        <Route
          path="/quiz-result"
          element={isLoggedIn ? <QuizResult /> : <Navigate to="/login" />}
        />
        <Route path="/daily-review" element={<DailyReview />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
