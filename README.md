# SmartAttend — Smart Student Attendance System
Version 3.1 | Web + Android | May 2026

SmartAttend is a secure, multi-role student attendance platform.
It combines a Node.js/Express backend, a React + Vite frontend, and a
native Kotlin Android app for a complete attendance management solution.

## 🚀 What it does
- Admin / Teacher / Student role-based dashboards
- Attendance sessions with QR, code, secure, and manual modes
- Face verification and geolocation validation for attendance marking
- Academic sessions, class/subject management, student promotion
- Correction request workflow with approval and audit trails
- Notification system with in-app alerts and optional FCM support
- Responsive web UI plus Android mobile client

## 📦 Repository structure
```
/                          ← Monorepo root
├── server/                ← Node.js backend (API)
├── client/                ← React frontend (Vite)
├── android/               ← Native Kotlin Android app
├── smartAttendance-Android/ ← Optional WebView wrapper app
├── project_setup.txt      ← Setup instructions
├── project_documentation.txt ← Detailed system documentation
├── START_STOP_GUIDE.md    ← Running and stopping the app
└── android/ANDROID_GUIDE.md ← Android app developer guide
```

## 🛠 Prerequisites
- Node.js 20+
- npm 9+
- PostgreSQL 16+
- Optional: Android Studio for the native Android project

## 🔧 Local setup
1. Clone or open the repository.
2. From the project root, install dependencies:
   ```bash
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd client && npm install && cd ..
   ```
4. Create a backend environment file:
   ```bash
   copy server\.env.example server\.env
   ```
5. Edit `server\.env` and set your PostgreSQL connection and secrets.

## 🔑 Required environment variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `SESSION_SECRET` — Express session secret
- `PORT` — optional backend port (default 5000)

## ▶️ Run the app
### Backend
```bash
cd server
npm run dev
```

### Frontend
```bash
cd client
npm run dev
```

Open the app in your browser:

`http://localhost:5173`

The frontend proxies `/api` requests to `http://localhost:5000`.

## 📄 Demo accounts
- Admin:   admin@smartattend.edu / Admin@123
- Teacher: priya@smartattend.edu / Teacher@123
- Student: aarav@smartattend.edu / Student@123

## 📚 Documentation
- `project_setup.txt` — Setup and configuration details
- `project_documentation.txt` — Architecture, API, and feature overview
- `START_STOP_GUIDE.md` — Start/stop commands and port troubleshooting

## 🧩 Hackathon Submission — AI at Work
We are preparing a focused submission for the Microsoft Build AI hackathon under the **AI at Work** theme (Productivity & Teamwork).

- Deck content (10 slides): `deck.md` — export as `TeamName_Deck.pdf`
- Hackathon README & checklist: `hackathon_readme.md`


