# 🎯 PrepMaster – Interview Preparation Platform

PrepMaster is a full-stack React application designed to help students prepare for technical interviews through quizzes, daily challenges, bookmarks, and streak tracking.  
It uses **Firebase Authentication** and **Firestore** for secure, real-time, cross-device data storage.

🔗 **Live Demo:** https://master-prep-66bo.vercel.app/login  

---

## ✨ Features

### 🔐 Authentication
- User registration & login using **Firebase Authentication**
- Secure session handling (no localStorage-based auth)
- Logout functionality

### 📚 Question Bank
- Subject-wise questions (DSA, DBMS, OS, CN, OOPS)
- Search, filter by subject & difficulty
- Track viewed questions

### ⭐ Bookmarks
- Bookmark important questions
- Categorize bookmarks (Important / Revise Later / Doubt)
- Data synced across devices using Firestore

### 📝 Quiz System
- Subject-wise quizzes with timer
- Randomized questions
- Instant result & answer review
- Quiz history stored per user

### 🔥 Daily Challenge & Streak
- One daily question challenge
- Calendar-based streak tracking
- View solved question for any past date
- Encourages consistency

### 📊 Dashboard
- Total quizzes attempted
- Bookmarked questions count
- Viewed questions count
- Best scores per subject
- Current streak display

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**
- **React Router**
- **Tailwind CSS**

### Backend / Services
- **Firebase Authentication**
- **Firebase Firestore**

### Deployment
- **Vercel**

---

## 🗂️ Project Structure

src/
├── components/
│ └── Navbar.jsx
│ └── StreakCalendar.jsx
├── pages/
│ ├── Login.jsx
│ ├── Register.jsx
│ ├── Dashboard.jsx
│ ├── Questions.jsx
│ ├── Bookmarks.jsx
│ ├── QuizSetup.jsx
│ ├── Quiz.jsx
│ ├── QuizResult.jsx
│ └── DailyReview.jsx
├── firebase.js
├── App.jsx
└── main.jsx

🚀 Getting Started Locally
1️⃣ Clone the repository
git clone https://github.com/nissankararaoThanvitha/prep-master.git
cd prep-master

2️⃣ Install dependencies
npm install

3️⃣ Run the app
npm run dev


App runs at:

http://localhost:5173
