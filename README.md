🚀 PrepMaster

PrepMaster is a React-based learning and practice platform designed to help students prepare for technical subjects with daily challenges, quizzes, streak tracking, and performance review — all in one place.

✨ Features
🔥 Daily Challenge

One daily question per user

Question remains same for that date

Correct answer updates streak automatically

📅 Streak Calendar

Monthly calendar view with previous month navigation

Green highlights for solved days

Today is clearly marked

Future dates are disabled

Hover to preview attempted questions

🧠 Subject-wise Quizzes

Subjects supported:

CN

DBMS

DSA

OOPS

OS

20 questions per quiz

Timer-based quiz

Navigation between questions (Prev / Next)

📊 Performance Tracking

Best score per subject

Quiz attempt history stored using localStorage

Review full quiz with:

Selected answers

Correct answers

Score summary

🔐 User-specific Data

Separate data per logged-in user

Streaks, questions, and quiz history are account-specific

🛠️ Tech Stack

Frontend: React (Vite)

Styling: Tailwind CSS

Routing: React Router

Storage: Browser LocalStorage

Deployment: Vercel

📂 Project Structure
prep-master/
│
├── public/
│   └── *.json        # Quiz question files
│
├── src/
│   ├── components/
│   │   └── StreakCalendar.jsx
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Quiz.jsx
│   │   ├── QuizResult.jsx
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
└── README.md
🚀 Getting Started (Local Setup)
1️⃣ Clone the repository
git clone https://github.com/<your-username>/prep-master.git
cd prep-master
2️⃣ Install dependencies
npm install
3️⃣ Run the project
npm run dev

Open 👉 http://localhost:5173
