# SMART ATTEND — PROJECT DOCUMENTATION

**Version 3.1 | May 2026**

## 1. Project overview
SmartAttend is a full-stack attendance management system built for Admin, Teacher, and Student users. It contains:

- A Node.js/Express backend API
- A React + Vite frontend client
- A Kotlin native Android client
- PostgreSQL database storage

## 2. Tech stack
- **Backend:** Node.js 20, Express 4, PostgreSQL 16, JWT, bcryptjs
- **Frontend:** React 18, Vite 5, TailwindCSS 3, Recharts, TensorFlow.js
- **Android:** Kotlin, MVVM, Hilt, Retrofit 2, CameraX, ML Kit
- **Security:** Helmet.js, express-rate-limit, express-validator
- **Realtime:** Socket.IO for live notifications and session updates

## 3. Features
- Role-based authentication for Admin, Teacher, Student
- Session-based attendance with code, QR, secure, and manual modes
- Face verification and GPS validation for student attendance
- Academic sessions, branches, classes, subjects, and student promotion
- Attendance correction requests and teacher review workflow
- Notifications and admin audit logging
- Responsive web UI and mobile-friendly Android app

## 4. Architecture
SmartAttend uses a multi-client architecture with a centralized backend and shared PostgreSQL storage.

- **Frontend:** React + Vite web app provides role-based dashboards for Admin, Teacher, and Student users. It runs locally on port 5173 in development and proxies `/api` requests to the backend on port 5000.
- **Android App:** Native Kotlin client supports QR/code scanning, face detection, GPS validation, attendance viewing, and push notifications. In emulator/debug mode it targets `http://10.0.2.2:5000/api/`.
- **Backend:** Node.js + Express serves RESTful APIs, handles authentication (JWT), attendance business logic, face verification logging, and session security.
- **Database:** PostgreSQL stores users, branches, classes, students, attendance sessions, records, notifications, audit logs, and anomaly logs.
- **Real-time Layer:** Socket.IO enables live session updates, notification broadcasts, and active attendance state changes. Firebase Cloud Messaging is optional for push notifications.

### Data flow
- Web/mobile clients send attendance actions, session management, and status requests to the Express API.
- Backend validates tokens, verifies attendance conditions (face/GPS), writes records to PostgreSQL, and emits real-time updates.
- Clients receive live alerts, attendance confirmations, and analytics insights through Socket.IO and optional FCM.

## 5. Backend components
- `server/index.js` — Entry point, security middleware, routes, Socket.IO
- `server/db/database.js` — PostgreSQL pool, schema creation, indexes
- `server/db/seed.js` — Demo seed data insertion (skips if admin exists)
- `server/routes/` — Auth, admin, teacher, student, notifications endpoints
- `server/middleware/auth.js` — JWT auth and role-based guard logic
- `server/services/` — Attendance and notification helpers

## 6. Database notes
The backend creates missing tables automatically during startup. The current schema supports:

- users, branches, classes, teachers, students
- subjects, academic_sessions, attendance_sessions, attendance
- attendance_requests, notifications, anomaly_logs
- audit_logs, password_reset_otps, face_verification_logs

## 7. API overview
- Auth routes: `/api/auth/*`
- Admin routes: `/api/admin/*`
- Teacher routes: `/api/teacher/*`
- Student routes: `/api/student/*`
- Notifications: `/api/notifications/*`

All protected routes require the `Authorization: Bearer <token>` header.

## 8. Project files
- `package.json` — Root scripts and dependency declarations
- `server/package.json` — Backend package metadata
- `client/package.json` — Frontend package metadata
- `client/vite.config.js` — Local dev server + proxy to port 5000
- `server/.env.example` — Example backend environment variables

## 9. Role access matrix
- **Students:** mark attendance, view history, request corrections, read notifications
- **Teachers:** manage attendance sessions, students, reports, review correction requests
- **Admins:** manage all users, classes, subjects, analytics, and audit logs

## 10. Demo accounts
- Admin    `admin@smartattend.edu` / `Admin@123`
- Teacher  `priya@smartattend.edu` / `Teacher@123`
- Student  `aarav@smartattend.edu` / `Student@123`

## 11. Seeding behavior
The backend runs `server/db/seed.js` on startup. It only inserts demo data if an admin user with email `admin@smartattend.edu` does not already exist.
