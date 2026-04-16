# SmartAttend — Full Stack Attendance System

## Overview

A secure, multi-platform student attendance management system with face
detection, geolocation, QR/code-based sessions, real-time session
management, correction request workflows, academic session management,
student promotion, and advanced analytics.

**Platforms:**
- **Web**: React 18 + Vite 5 + TailwindCSS 3 (frontend)
- **Backend**: Node.js 20 + Express 4 + PostgreSQL
- **Mobile**: Kotlin Android app (MVVM + Hilt + Retrofit 2)

---

## Tech Stack

| Layer             | Technology                                          |
|-------------------|-----------------------------------------------------|
| Backend           | Node.js 20 + Express 4 (CommonJS)                  |
| Database          | PostgreSQL (pg pool, raw SQL, UUID PKs)             |
| Auth              | JWT (24 h expiry) + bcryptjs                        |
| Frontend          | React 18 + Vite 5 + TailwindCSS 3                  |
| Face Detection    | TensorFlow.js + @tensorflow-models/face-detection   |
| Charts            | Recharts 2                                          |
| Mobile            | Kotlin (API 26+), MVVM, Hilt DI, Retrofit 2        |
| Push Notifications| Firebase Cloud Messaging (FCM) — optional           |
| Camera (Android)  | CameraX                                             |
| Charts (Android)  | MPAndroidChart v3.1.0                               |

---

## Running the Project

**Backend** (port 5000 — auto-starts on Replit):
```bash
node server/index.js
```

**Frontend dev server** (port 5173 — auto-starts on Replit):
```bash
cd client && npm run dev
```

**Production build** (backend serves `client/dist/` as static files):
```bash
cd client && npm run build
```

The Vite dev server proxies `/api/*` → `http://localhost:5000`.
In production, Express at port 5000 serves `client/dist/` statically and
handles all `/api/*` routes directly.

**Database**: PostgreSQL — `DATABASE_URL` env var is set automatically by
Replit. Schema is auto-created and demo data is seeded on every backend
restart.

---

## Demo Credentials (auto-seeded on every backend restart)

| Role    | Email                       | Password    |
|---------|-----------------------------|-------------|
| Admin   | admin@smartattend.edu       | Admin@123   |
| Teacher | priya@smartattend.edu       | Teacher@123 |
| Teacher | rajan@smartattend.edu       | Teacher@123 |
| Student | aarav@smartattend.edu       | Student@123 |
| Student | priya.s@smartattend.edu     | Student@123 |
| Student | rahul@smartattend.edu       | Student@123 |
| Student | ananya@smartattend.edu      | Student@123 |
| Student | karan@smartattend.edu       | Student@123 |
| Student | sneha@smartattend.edu       | Student@123 |

---

## Project Structure

```
/server
  index.js                    ← Entry: rate limiting, CORS, route mount
  /routes
    auth.js                   ← Login, register, OTP, profile, photo, FCM token
    admin.js                  ← Admin CRUD + analytics + audit + sessions
    teacher.js                ← Teacher ops + sessions + manual att. + requests
    student.js                ← Student ops + mark attendance + requests + notifs
    notifications.js          ← Generic notification CRUD (all roles)
  /middleware
    auth.js                   ← authenticateToken (JWT), requireRole
  /db
    database.js               ← pg pool + initDB (drops+recreates schema in dev)
    seed.js                   ← Seeds demo users, class, subjects, attendance
    init.js                   ← Schema-only init helper
    firebase.js               ← Firebase Admin SDK init (optional)
  /services
    attendanceService.js      ← Low-attendance query helper
    notificationService.js    ← Notification creation helper

/client
  /src
    App.jsx                   ← BrowserRouter, all routes, ProtectedRoute HOC
    /context
      AuthContext.jsx         ← JWT auth state, axios header, updateUser, refreshUser
    /components
      Layout.jsx              ← Sidebar nav (role-aware), header, shell
      FaceCapture.jsx         ← TF.js face capture UI component
      FormFields.jsx          ← Shared icon-input + password-toggle helpers
      NotificationBell.jsx    ← Header bell with unread badge + dropdown
    /hooks
      useFaceDetection.js     ← TF.js model load + detection loop
      useGeolocation.js       ← Browser Geolocation API wrapper
    /pages
      Login.jsx
      ForgotPassword.jsx
      HomePage.jsx
      /admin                  ← Dashboard, ManageStudents, ManageTeachers,
                                 ManageClasses, ManageSubjects, Reports,
                                 Analytics, AttendanceAnalytics, AuditLogs, Profile
      /teacher                ← Dashboard, TakeAttendance, ActiveSessions,
                                 Students, Records, Reports, Requests, Profile
      /student                ← Dashboard, Attendance, MarkAttendance,
                                 Requests, Notifications, Profile

/android                      ← Kotlin MVVM Android app
  /app/src/main/java/com/smartattend/
    SmartAttendApp.kt         ← @HiltAndroidApp entry point
    /ui
      SplashActivity.kt       ← LAUNCHER: animated splash → checks token → routes
      HomeActivity.kt         ← Role-selection screen (Student/Teacher/Admin cards)
      MainActivity.kt         ← NavController host + bottom nav + toolbar + logout
      MainViewModel.kt        ← isLoggedIn, getUserRole, getUserName, logout
      /auth                   ← LoginActivity, RegisterActivity, ForgotPasswordActivity
                                 (+ ViewModels for each)
      /student                ← StudentDashboardFragment, StudentHistoryFragment,
                                 MarkAttendanceFragment, StudentRequestsFragment,
                                 StudentNotificationsFragment
                                 (+ ViewModels and adapters)
      /teacher                ← TeacherDashboardFragment, TakeAttendanceFragment,
                                 ActiveSessionsFragment, TeacherStudentsFragment,
                                 TeacherReportsFragment, TeacherRequestsFragment
                                 (+ ViewModels and adapters)
      /admin                  ← AdminDashboardFragment, AdminStudentsFragment,
                                 AdminTeachersFragment, AdminClassesFragment,
                                 AdminSubjectsFragment, AdminAnalyticsFragment,
                                 AdminAuditLogsFragment
                                 (+ ViewModels and adapters)
      /profile                ← ProfileFragment (shared across roles),
                                 EditProfileActivity, ChangePasswordActivity
    /data
      /api                    ← ApiService.kt (all Retrofit endpoints),
                                 AuthInterceptor.kt (JWT header injection)
      /local                  ← PreferenceManager.kt (DataStore — token + user info)
      /repository             ← AuthRepository, StudentRepository,
                                 TeacherRepository, AdminRepository
    /domain/model             ← Models.kt, ProfileModels.kt (all request/response classes)
    /di                       ← AppModule.kt (Hilt: Retrofit, OkHttp, ApiService)
    /service                  ← SmartAttendFCMService.kt (FCM push handler)
    /util                     ← Resource.kt (sealed Loading/Success/Error),
                                 TokenManager.kt (sync token read for SplashActivity)
  /res
    /drawable                 ← All vector icons + shape drawables
    /color                    ← bottom_nav_color.xml (color state list)
    /layout                   ← All activity + fragment + item + dialog layouts
    /menu                     ← menu_student/teacher/admin.xml + menu_main_overflow.xml
    /navigation               ← nav_student.xml, nav_teacher.xml, nav_admin.xml
    /values                   ← colors.xml, themes.xml, strings.xml
```

---

## API Overview

All protected routes require `Authorization: Bearer <token>`.

| Prefix             | Role Required     | Purpose                              |
|--------------------|-------------------|--------------------------------------|
| `/api/auth`        | Public / Any      | Login, register, OTP, profile        |
| `/api/admin`       | admin             | Full system management + analytics   |
| `/api/teacher`     | teacher, admin    | Sessions, students, reports          |
| `/api/student`     | student, admin    | Attendance, mark, requests, notifs   |
| `/api/notifications` | Any (auth)      | Notification CRUD                    |

---

## Feature Status Summary

**Web App**: Feature-complete across all three roles (Admin, Teacher, Student).

**Android App**: Core flows complete for all roles. Pending:
- ML Kit face detection integration (MarkAttendanceFragment)
- ZXing QR code scanner (MarkAttendanceFragment)
- FusedLocation GPS integration (MarkAttendanceFragment)
- Admin: Create/Edit dialogs for Students and Teachers (list + delete only)

**Backend**: All REST endpoints implemented. Pending:
- Real SMTP email for OTP delivery (currently logs to console)
- Real Firebase credentials for FCM push delivery
- Pagination on high-volume endpoints
- WebSocket / SSE for real-time updates

---

## Key Developer Notes

### Responsive UI
The React web app uses a mobile-first shell. The authenticated sidebar is a
mobile drawer and desktop sidebar, shared cards use responsive padding, modals
are viewport-height constrained with internal scrolling, and the notification
dropdown is viewport-bound on mobile so it cannot be cropped off-screen.

Form fields with leading icons and password visibility toggles use the shared
`client/src/components/FormFields.jsx` helpers. Input CSS classes are defined
**outside** `@layer`, so Tailwind utilities that must override them use the
`!` important modifier (e.g. `!pl-10`, `!pr-11`).

### Database Reset on Restart (Dev Only)
`server/db/database.js` drops and recreates all tables on every
backend start. This is intentional during development. **Remove all
`DROP TABLE` statements before any production deployment.**

### OTP Delivery
OTPs are printed to the server console (stdout). Look for lines like:
```
OTP for user@example.com: 123456
```
Configure nodemailer with real SMTP credentials for email delivery.

### Android Launch Flow
```
SplashActivity (LAUNCHER)
  ↓ 2s animation
  ├── token present → MainActivity (role-based nav graph)
  └── no token     → HomeActivity (Student / Teacher / Admin cards)
                         ↓ card tap
                       LoginActivity (pre-fills demo creds in debug)
```
Logout is available via the overflow menu (⋮) in the MainActivity toolbar.
Tapping Logout clears the DataStore session and returns to HomeActivity.

### Android BASE_URL
- Emulator debug: `http://10.0.2.2:5000/api/`
- Physical device: `http://<your-machine-ip>:5000/api/`
- Release / production: `https://<your-domain>/api/`
Set in `android/app/build.gradle` → `buildConfigField "String", "BASE_URL"`.

### Android DataStore
`Context.dataStore` extension is defined once in `PreferenceManager.kt`
(name: `smartattend_prefs`). Both `PreferenceManager` and `TokenManager`
reference the same DataStore — no conflict.

### Session Expiry
Session countdown timers in the UI are cosmetic. The server is the
authority: `expires_at` is checked on every `POST /attendance/mark`
call. Expired sessions cannot be used to mark attendance.

### Profile Photos
Stored as base64 TEXT in PostgreSQL. Acceptable for development.
For production, migrate to object storage (AWS S3, Cloudflare R2, etc.)
and store URLs instead.

### Firebase (Optional)
The Firebase Admin SDK is initialised in `server/db/firebase.js`.
Without `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
`FIREBASE_PRIVATE_KEY` env vars, push notifications are silently skipped.
In-app (DB-backed) notifications always work regardless of Firebase.

---

## Environment Variables

| Variable                | Required     | Description                              |
|-------------------------|--------------|------------------------------------------|
| `DATABASE_URL`          | Yes          | PostgreSQL connection string             |
| `JWT_SECRET`            | Yes (prod)   | JWT signing secret (has hardcoded dev fallback) |
| `SESSION_SECRET`        | Yes (prod)   | Express session secret                   |
| `PORT`                  | No           | Backend port (default: 5000)             |
| `FIREBASE_PROJECT_ID`   | No           | Firebase project ID (FCM push)           |
| `FIREBASE_CLIENT_EMAIL` | No           | Firebase service account email           |
| `FIREBASE_PRIVATE_KEY`  | No           | Firebase private key                     |

---

## Production Checklist

- [ ] Remove `DROP TABLE` from `server/db/database.js`
- [ ] Set strong `JWT_SECRET` + `SESSION_SECRET` env vars
- [ ] Restrict CORS to production domain in `server/index.js`
- [ ] Add `helmet.js` for HTTP security headers
- [ ] Configure SMTP for OTP email delivery
- [ ] Build frontend: `cd client && npm run build`
- [ ] Use PM2 as process manager
- [ ] Add DB indexes on `attendance.date`, `attendance.student_id`,
  `notifications.user_id`, `attendance_sessions.is_active`
- [ ] Complete Android ML Kit + ZXing + FusedLocation integrations
- [ ] Update Android release `BASE_URL` to production domain
- [ ] Generate signed APK/AAB with production keystore

---

## Bug Fixes Applied (April 2026 QA Pass)

| ID | Severity | Fix Summary |
|----|----------|-------------|
| BUG-01 | Critical | `server/routes/student.js`: Removed fallback in session lock — 403 is now returned if no active academic session exists, preventing lock bypass |
| BUG-02 | High | `server/routes/admin.js`: Removed duplicate academic-sessions and promote route blocks; kept the superior set (audit logging, atomic SQL, DELETE endpoint) |
| BUG-03 | Medium | `server/routes/admin.js`: Added `AND current_session != $2` to promote SQL, preventing students already in the target session from being promoted again |
| BUG-04 | Medium | `server/routes/student.js`: Mark-attendance response now includes `semester` and `session` fields |
| BUG-05 | Medium | `server/routes/admin.js`: Promote endpoint now runs inside a `withTransaction` wrapper (BEGIN/COMMIT/ROLLBACK) with in-transaction notifications |
| BUG-06 | Low | `server/index.js`: Auth rate limiter raised from 20 → 100 requests per 15 min |
| BUG-07 | Low | `client/src/pages/admin/Reports.jsx`: Added Session and Semester filter dropdowns (wired to existing backend query params) |

A `withTransaction(fn)` helper was added to `server/db/database.js` and exported alongside `query`.

*Last updated: April 2026 | Version 2.4*
