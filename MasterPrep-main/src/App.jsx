import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

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
import Progress from "./pages/Progress";
import Revise from "./pages/Revise";
import InterviewSetup from "./pages/InterviewSetup";
import Interview from "./pages/Interview";

function App() {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;

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
          path="/interview"
          element={isLoggedIn ? <InterviewSetup /> : <Navigate to="/login" />}
        />

        <Route
          path="/interview/:id"
          element={isLoggedIn ? <Interview /> : <Navigate to="/login" />}
        />

        <Route
          path="/revise"
          element={isLoggedIn ? <Revise /> : <Navigate to="/login" />}
        />

        <Route
          path="/progress"
          element={isLoggedIn ? <Progress /> : <Navigate to="/login" />}
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

        <Route
          path="/ai-chat"
          element={isLoggedIn ? <AIDoubtChat /> : <Navigate to="/login" />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
