# SmartAttend — Android App Developer Guide

## Overview
SmartAttend Android is a Kotlin application following MVVM + Clean Architecture. It connects to the SmartAttend Node.js/Express + PostgreSQL backend via REST API (Retrofit + OkHttp with JWT auth). Version 2.3.

---

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| Language | Kotlin | 1.9.x |
| Architecture | MVVM + Clean Architecture | — |
| UI | Material Design 3 + ViewBinding | — |
| Dependency Injection | Hilt | 2.50 |
| Networking | Retrofit + OkHttp | 2.9.0 / 4.12.0 |
| Local Storage | DataStore Preferences (Jetpack) | 1.0.0 |
| Face Detection | Google ML Kit | 16.1.6 |
| Camera | CameraX | 1.3.1 |
| Location | FusedLocationProviderClient (Play Services) | 21.1.0 |
| QR Scanning | ZXing + zxing-android-embedded | 3.5.3 / 4.3.0 |
| Charts | MPAndroidChart | v3.1.0 |
| Push Notifications | Firebase Cloud Messaging | BOM 32.7.2 |
| PDF Export | iText7 Core | 7.2.5 |
| Image Loading | Glide | 4.16.0 |
| Async | Kotlin Coroutines | 1.7.3 |
| Shimmer Loading | Facebook Shimmer | 0.5.0 |

Build tools: Gradle 8.2, AGP 8.2.2, Java 17, compileSdk/targetSdk 34, minSdk 26 (Android 8.0+)

---

## Prerequisites

- **Android Studio** Hedgehog (2023.1.1) or later
- **Android SDK** 34 (installed via SDK Manager)
- **Java 17** (bundled with recent Android Studio)
- **Minimum device**: Android 8.0 (API 26)
- Physical device recommended for Camera + GPS features

---

## App Launch Flow

```
SplashActivity (LAUNCHER)
    ↓ 2-second animated entrance (logo scale-in, text slide-up)
    ├── token in DataStore  →  MainActivity
    │                               ↓ role-based nav graph
    │                         Student / Teacher / Admin screens
    │                         Logout via toolbar overflow menu (⋮)
    └── no token            →  HomeActivity
                                    ↓ role-selection cards
                              Student / Teacher / Admin card tap
                                    ↓
                              LoginActivity (pre-fills demo creds
                                             in debug builds)
```

Key activity responsibilities:
- **SplashActivity** — LAUNCHER; animated splash; reads DataStore token synchronously via TokenManager.getToken() (runBlocking); routes to HomeActivity or MainActivity
- **HomeActivity** — Role-selection screen; no ViewModel needed; starts LoginActivity with `EXTRA_ROLE`
- **MainActivity** — NavController host; sets up role-specific navigation graph + bottom nav; displays user initial in toolbar; provides logout via overflow menu

---

## Quick Start

### 1. Open the Project
```
Android Studio → File → Open → select the android/ folder
```
Wait for the initial Gradle sync to complete.

### 2. Backend URL
The `BASE_URL` is pre-configured in `app/build.gradle`:

```gradle
// Debug — for Android Emulator (routes to host machine localhost)
debug {
    buildConfigField "String", "BASE_URL", '"http://10.0.2.2:5000/api/"'
}

// Release — update to your live backend domain
defaultConfig {
    buildConfigField "String", "BASE_URL", '"https://<your-replit-url>.replit.dev/api/"'
}
```

For a physical device on the same network, change `10.0.2.2` to your machine's local IP (e.g., `192.168.1.100`).

### 3. Firebase Setup (for Push Notifications)
Push notifications require a real Firebase project. The placeholder `google-services.json` included will allow the app to build but notifications won't work until replaced.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project → Add Android app → Package name: `com.smartattend`
3. Download `google-services.json`
4. Replace `android/app/google-services.json` with your downloaded file

### 4. Run the App
- Select your device/emulator in Android Studio
- Click **Run ▶** (or press `Shift+F10`)
- For emulator: use API 26+ AVD; enable camera and GPS in Extended Controls

### 5. Build APK
```bash
# Debug APK
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires signing config)
./gradlew assembleRelease
```

---

## Project Structure

```
android/app/src/main/java/com/smartattend/
├── SmartAttendApp.kt                     # @HiltAndroidApp entry point
│
├── data/
│   ├── api/
│   │   ├── ApiService.kt                 # All REST endpoints (Retrofit)
│   │   └── AuthInterceptor.kt            # Injects "Authorization: Bearer <token>"
│   ├── local/
│   │   └── PreferenceManager.kt          # DataStore Preferences: token, role,
│   │                                     # name, email, profileId, classId
│   └── repository/
│       ├── AuthRepository.kt             # Login, profile, FCM, getUserName
│       ├── StudentRepository.kt          # Dashboard, attendance, sessions,
│       │                                 # requests, notifications
│       ├── TeacherRepository.kt          # Dashboard, sessions CRUD,
│       │                                 # students CRUD, attendance, reports
│       └── AdminRepository.kt            # Stats, students, teachers, classes,
│                                         # subjects CRUD, analytics, audit logs
│
├── domain/
│   └── model/
│       ├── Models.kt                     # All request + response data classes
│       └── ProfileModels.kt              # Profile-specific models
│
├── ui/
│   ├── SplashActivity.kt                 # LAUNCHER: animated splash + routing
│   ├── HomeActivity.kt                   # Role-selection screen
│   ├── MainActivity.kt                   # NavController host + bottom nav +
│   │                                     # user initial + logout overflow menu
│   ├── MainViewModel.kt                  # isLoggedIn, getUserRole,
│   │                                     # getUserName, logout
│   ├── auth/
│   │   ├── LoginActivity.kt              # Email + password login
│   │   ├── LoginViewModel.kt
│   │   ├── RegisterActivity.kt           # Student self-registration
│   │   ├── RegisterViewModel.kt
│   │   ├── ForgotPasswordActivity.kt     # OTP request + verify + reset flow
│   │   └── ForgotPasswordViewModel.kt
│   ├── student/
│   │   ├── StudentDashboardFragment.kt
│   │   ├── StudentDashboardViewModel.kt
│   │   ├── StudentHistoryFragment.kt
│   │   ├── StudentHistoryViewModel.kt
│   │   ├── MarkAttendanceFragment.kt     # Session list + code entry
│   │   ├── MarkAttendanceViewModel.kt
│   │   ├── StudentRequestsFragment.kt
│   │   ├── StudentRequestsViewModel.kt
│   │   ├── RequestsAdapter.kt
│   │   ├── StudentNotificationsFragment.kt
│   │   ├── StudentNotificationsViewModel.kt
│   │   └── NotificationsAdapter.kt
│   ├── teacher/
│   │   ├── TeacherDashboardFragment.kt
│   │   ├── TeacherDashboardViewModel.kt
│   │   ├── TakeAttendanceFragment.kt     # Manual + Code + QR + Secure sessions
│   │   ├── TakeAttendanceViewModel.kt
│   │   ├── ActiveSessionsFragment.kt     # Session cards with countdown + stop
│   │   ├── ActiveSessionsViewModel.kt    # Polling, stop, filter toggle
│   │   ├── ActiveSessionsAdapter.kt      # Per-card countdown timer
│   │   ├── ManualAttendanceAdapter.kt
│   │   ├── TeacherStudentsFragment.kt    # CRUD: student list + FAB + search
│   │   ├── TeacherStudentsViewModel.kt
│   │   ├── TeacherStudentsAdapter.kt
│   │   ├── TeacherReportsFragment.kt
│   │   ├── TeacherReportsViewModel.kt
│   │   ├── TeacherRequestsFragment.kt
│   │   └── TeacherRequestsViewModel.kt
│   ├── admin/
│   │   ├── AdminDashboardFragment.kt
│   │   ├── AdminDashboardViewModel.kt
│   │   ├── AdminStudentsFragment.kt
│   │   ├── AdminStudentsViewModel.kt
│   │   ├── AdminStudentsAdapter.kt
│   │   ├── AdminTeachersFragment.kt
│   │   ├── AdminTeachersViewModel.kt
│   │   ├── AdminTeachersAdapter.kt
│   │   ├── AdminClassesFragment.kt
│   │   ├── AdminClassesViewModel.kt
│   │   ├── AdminClassesAdapter.kt
│   │   ├── AdminSubjectsFragment.kt      # CRUD: subjects + class/teacher assign
│   │   ├── AdminSubjectsViewModel.kt
│   │   ├── AdminSubjectsAdapter.kt
│   │   ├── AdminAnalyticsFragment.kt     # MPAndroidChart line + bar charts
│   │   ├── AdminAnalyticsViewModel.kt
│   │   ├── AdminAuditLogsFragment.kt
│   │   ├── AdminAuditLogsViewModel.kt
│   │   └── AdminAuditLogsAdapter.kt
│   └── profile/
│       ├── ProfileFragment.kt            # Shared across all roles
│       ├── ProfileViewModel.kt
│       ├── EditProfileActivity.kt
│       └── ChangePasswordActivity.kt
│
├── di/
│   └── AppModule.kt                      # Hilt: OkHttpClient, Retrofit, ApiService
│
├── service/
│   └── SmartAttendFCMService.kt          # FCM push handler + notification channels
│
└── util/
    ├── Resource.kt                       # sealed class: Loading | Success<T> | Error
    └── TokenManager.kt                   # Sync token read via runBlocking (Splash use)
```

**Layouts** (`res/layout/`):

| File | Used by |
|---|---|
| `activity_splash.xml` | SplashActivity |
| `activity_home.xml` | HomeActivity (role-selection cards) |
| `activity_main.xml` | MainActivity (toolbar + NavHost + BottomNav) |
| `activity_login.xml` | LoginActivity |
| `activity_register.xml` | RegisterActivity |
| `activity_forgot_password.xml` | ForgotPasswordActivity |
| `activity_edit_profile.xml` | EditProfileActivity |
| `activity_change_password.xml` | ChangePasswordActivity |
| `fragment_student_dashboard.xml` | StudentDashboardFragment |
| `fragment_student_history.xml` | StudentHistoryFragment |
| `fragment_mark_attendance.xml` | MarkAttendanceFragment |
| `fragment_student_requests.xml` | StudentRequestsFragment |
| `fragment_student_notifications.xml` | StudentNotificationsFragment |
| `fragment_teacher_dashboard.xml` | TeacherDashboardFragment |
| `fragment_take_attendance.xml` | TakeAttendanceFragment |
| `fragment_active_sessions.xml` | ActiveSessionsFragment |
| `fragment_teacher_students.xml` | TeacherStudentsFragment |
| `fragment_teacher_reports.xml` | TeacherReportsFragment |
| `fragment_teacher_requests.xml` | TeacherRequestsFragment |
| `fragment_admin_dashboard.xml` | AdminDashboardFragment |
| `fragment_admin_students.xml` | AdminStudentsFragment |
| `fragment_admin_teachers.xml` | AdminTeachersFragment |
| `fragment_admin_classes.xml` | AdminClassesFragment |
| `fragment_admin_subjects.xml` | AdminSubjectsFragment |
| `fragment_admin_analytics.xml` | AdminAnalyticsFragment |
| `fragment_admin_audit_logs.xml` | AdminAuditLogsFragment |
| `fragment_profile.xml` | ProfileFragment |
| `item_active_session.xml` | ActiveSessionsAdapter (teacher + student) |
| `item_manual_attendance.xml` | ManualAttendanceAdapter |
| `item_teacher_student.xml` | TeacherStudentsAdapter |
| `item_admin_subject.xml` | AdminSubjectsAdapter |
| `item_audit_log.xml` | AdminAuditLogsAdapter |
| `item_low_attendance.xml` | Admin Analytics low-attendance list |
| `item_subject_stat.xml` | Admin Analytics subject stats |
| `dialog_student_form.xml` | Teacher add/edit student dialog |
| `dialog_subject_form.xml` | Admin add/edit subject dialog |

**Navigation graphs** (`res/navigation/`):

| Graph | Fragments |
|---|---|
| `nav_student.xml` | Dashboard, MarkAttendance, History, Requests, Notifications, Profile |
| `nav_teacher.xml` | Dashboard, Students, TakeAttendance, ActiveSessions, Reports, Requests, Profile |
| `nav_admin.xml` | Dashboard, Students, Teachers, Classes, Subjects, Analytics, AuditLogs, Profile |

**Menus** (`res/menu/`):

| File | Purpose |
|---|---|
| `menu_student.xml` | Bottom navigation for Student role (6 items) |
| `menu_teacher.xml` | Bottom navigation for Teacher role (7 items) |
| `menu_admin.xml` | Bottom navigation for Admin role (8 items) |
| `menu_main_overflow.xml` | Toolbar overflow — Logout item |

**Drawables** (`res/drawable/`):

| File | Usage |
|---|---|
| `ic_graduation_cap.xml` | HomeActivity logo card |
| `ic_student.xml` | HomeActivity Student card icon |
| `ic_teacher.xml` | HomeActivity Teacher card icon |
| `ic_shield.xml` | HomeActivity Admin card icon |
| `ic_arrow_right.xml` | HomeActivity role card chevron |
| `ic_mail.xml` | Login / ForgotPassword email field |
| `ic_lock.xml` | Login / ChangePassword password field |
| `ic_location.xml` | MarkAttendance location indicator |
| `ic_face_detection.xml` | MarkAttendance face detection indicator |
| `ic_notification.xml` | FCM default notification icon |
| `bg_input_rounded.xml` | Rounded input field background |
| `badge_blue.xml` | "Most Used" badge on Teacher card |
| `circle_blue_solid.xml` | Solid blue circle shape |
| `circle_blue_glow.xml` | Blue circle with glow effect |
| `circle_green_solid.xml` | Solid green circle shape |
| `circle_violet_glow.xml` | Violet circle with glow effect |
| `pill_blue/green/violet.xml` | Feature pill badges on HomeActivity |

**Color state lists** (`res/color/`):

| File | Usage |
|---|---|
| `bottom_nav_color.xml` | Icon/text tint for bottom navigation items |

---

## Feature Overview

### Student Module
- **Dashboard** — Subject-wise attendance percentage summary
- **Mark Attendance**
  - Browse active sessions for enrolled class
  - Enter 6-digit attendance code manually
  - QR Code scanning (ZXing — declared, not yet wired)
  - Face verification (ML Kit — declared, not yet wired)
  - Location capture (FusedLocationProviderClient — declared, not yet wired)
- **Attendance History** — Date range + subject filter
- **Requests** — Submit missed/incorrect attendance correction request
- **Notifications** — In-app notification list + mark-read

### Teacher Module
- **Dashboard** — Today's stats (present/absent/total), pending requests count
- **Students** — CRUD: create/edit/delete students; search bar with live filter
- **Take Attendance**
  - Manual mode: mark each student P/A per session
  - Code session: generates 6-digit code, 10-min auto-expiry
  - QR session: generates scannable QR data
  - Secure session: requires face + location
- **Active Sessions** — Session cards with real-time countdown timers
  - Stop Session with confirmation dialog
  - Toggle: Active Only ↔ All Today
  - Background polling every 30 seconds
- **Reports** — Per-student % report, low attendance shortlist
- **Requests** — Approve / reject with teacher note

### Admin Module
- Full CRUD: Students, Teachers, Classes, Subjects (with class + teacher assignment)
- **Analytics** — MPAndroidChart line chart (attendance trend) + subject stats
- **Audit Logs** — Chronological list of all user actions

---

## Teacher Active Session Management (Detail)

### ActiveSessionsViewModel
```kotlin
val sessions: StateFlow<List<AttendanceSession>>  // current session list
val isLoading: StateFlow<Boolean>
val stopState: StateFlow<Resource<MessageResponse>?>
val showActiveOnly: StateFlow<Boolean>             // filter toggle state

fun loadActiveSessions()           // GET /teacher/sessions/active
fun loadAllTodaySessions()         // GET /teacher/sessions  (active+expired+stopped)
fun stopSession(id: String)        // DELETE /teacher/sessions/:id + optimistic remove
fun onSessionExpiredLocally(s)     // removes from list when client-side timer hits 0
fun toggleFilter()                 // switch active-only ↔ all-today + reload
fun manualRefresh()                // triggered by swipe-to-refresh
```

### Polling Strategy
- Background coroutine polls every **30 seconds** automatically
- `manualRefresh()` triggers immediate silent refresh
- Polling cancels in `onCleared()` — no leaks

### Timer Implementation
- Each `ActiveSessionsAdapter` view holder holds a `Handler(Looper.getMainLooper())`
- Ticks every 1 second, calculates `expiresAt - System.currentTimeMillis()`
- Calls `onSessionExpired(session)` callback when countdown hits zero
- `cancelAllTimers()` called from `Fragment.onDestroyView()` to prevent leaks

---

## Backend Session Lifecycle (RBAC)

```
POST /teacher/sessions
  ├── RBAC: teacher must own the subject (403 otherwise)
  ├── Guard: attendance already marked today? → 409
  ├── Guard: active session exists for subject? → 409
  └── Creates session with 10-min expiry, returns { id, code, qr_data, expires_at }

DELETE /teacher/sessions/:id
  ├── RBAC: session must belong to teacher (403 otherwise)
  │         OR request must be from admin role
  └── Sets is_active = false, logs to audit_logs

GET /teacher/sessions/active
  └── WHERE is_active=true AND expires_at > NOW() AND teacher_id = me

GET /teacher/sessions
  └── All today's sessions with computed status: active | expired | stopped
```

---

## Geo-Fencing
- Teacher captures classroom GPS coordinates when starting a session (optional)
- `latitude`, `longitude`, `radius_meters` stored on session (default radius: 100m)
- Backend calculates Haversine distance between student location and session coordinates
- Student's attendance rejected if outside radius — server-side only (prevents spoofing)

---

## Face Detection & Anomaly Detection
- ML Kit `FaceDetector` declared in build.gradle; integration in MarkAttendanceFragment is pending
- Head angle anomaly flagged if Euler Y/Z > 40°
- Repeated failure anomalies logged to `anomaly_logs` table via backend
- Face verification result sent to backend as `face_verified: boolean` field

---

## Push Notifications (FCM)
- Service: `SmartAttendFCMService.kt`
- Channels created on first launch:
  - `attendance_channel` — HIGH importance (attendance alerts)
  - `smartattend_channel` — DEFAULT importance (general)
- FCM token auto-registered via `POST /api/auth/fcm-token` after login
- Teachers can send manual low-attendance alerts to individual students

---

## DataStore & TokenManager

`PreferenceManager.kt` defines the `Context.dataStore` extension (name: `smartattend_prefs`).
Keys stored: `auth_token`, `user_id`, `user_name`, `user_email`, `user_role`,
`profile_id`, `class_id`.

`TokenManager.kt` provides a synchronous `getToken()` / `getUserRole()` using `runBlocking`
for the one case where async is not possible: the routing decision in `SplashActivity.navigateAfterDelay()`.
All other token access goes through `PreferenceManager` flows.

---

## Build Fixes Applied

All the following issues have been diagnosed and fixed:

| Issue | Fix Applied |
|---|---|
| `SafeArgs` plugin with no `<argument>` nav args | Removed `id 'androidx.navigation.safeargs.kotlin'` |
| `FAIL_ON_PROJECT_REPOS` + JitPack not in settings | Changed to `PREFER_SETTINGS`; added JitPack block |
| `allprojects { repositories {} }` conflict | Removed root `allprojects` block |
| Missing `gradle.properties` | Created with `android.useAndroidX=true` + `android.enableJetifier=true` |
| Missing `gradle-wrapper.properties` | Created for Gradle 8.2 |
| Missing `gradle-wrapper.jar` | Downloaded 62KB JAR file |
| Missing `proguard-rules.pro` | Created with rules for Retrofit, Hilt, Gson, Firebase, Parcelable |
| Missing `gradlew` / `gradlew.bat` | Created Unix + Windows wrapper scripts |
| `@ExperimentalGetImage` propagation (CameraX) | Added `-opt-in=androidx.camera.core.ExperimentalGetImage` to `freeCompilerArgs` |
| Wrong LAUNCHER activity (MainActivity) | Swapped intent-filter to SplashActivity; set `exported="true"` and Splash theme |
| Missing vector drawables (crash on HomeActivity) | Created: `ic_graduation_cap`, `ic_student`, `ic_teacher`, `ic_shield`, `ic_arrow_right`, `ic_mail`, `ic_lock`, `ic_location`, `ic_face_detection`, `circle_blue_solid` |
| `@color/bottom_nav_color` missing | Already existed in `res/color/`; verified correct |
| No logout functionality | Added `menu_main_overflow.xml` + overflow menu handler in `MainActivity` |
| Toolbar user initial always "A" | `MainActivity` now reads `getUserName()` from `PreferenceManager` via `MainViewModel` |
| Non-logged users sent to LoginActivity directly | `MainActivity` now routes to `HomeActivity` (role-selection) instead |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@smartattend.edu | Admin@123 |
| Teacher | priya@smartattend.edu | Teacher@123 |
| Student | aarav@smartattend.edu | Student@123 |

In debug builds, HomeActivity pre-fills the matching demo credentials into LoginActivity automatically when a role card is tapped.

---

*Last Updated: April 2026 | Version 2.3*
