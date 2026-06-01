# SmartAttend Android App — Developer Guide

## Overview
The native Android client for SmartAttend is implemented in Kotlin using
MVVM architecture, Hilt dependency injection, Retrofit networking, CameraX,
and Google ML Kit for face-related attendance features.

## Required tools
- Android Studio 2023.1 Hedgehog or later
- Android SDK 34
- JDK 17 (bundled with Android Studio)
- Android device or emulator with API 26+

## Project setup
1. Open Android Studio.
2. Select `Open` and choose the repository `android/` folder.
3. Wait for Gradle sync to finish.
4. If prompted to install SDK components, accept the defaults.
5. Ensure the `local.properties` file points to your SDK installation.

## Backend URL
The native app uses a debug base URL configured in Gradle.
In emulator mode, use:
`http://10.0.2.2:5000/api/`

For a physical device, replace `10.0.2.2` with your machine's local IP.

## Run the app
- Start the backend:
  ```bash
  cd server
  npm run dev
  ```
- Start Android Studio and run the app on emulator or device.

## Build commands
### Debug APK
```bash
cd android
./gradlew assembleDebug
```

### Release APK
```bash
cd android
./gradlew assembleRelease
```

The generated APK files are located in:
`android/app/build/outputs/apk/`

## App architecture
- `SmartAttendApp.kt` — Hilt application entry point
- `MainActivity.kt` — Host activity with bottom navigation and logout
- `SplashActivity.kt` — Launch screen and token-based routing
- `HomeActivity.kt` — Role-selection screen
- `LoginActivity.kt`, `RegisterActivity.kt`, `ForgotPasswordActivity.kt`
- Role fragments for Student, Teacher, Admin and shared Profile
- Data layer: Retrofit API service + AuthInterceptor + PreferenceManager

## Key resources
- `app/build.gradle` — compile/target SDK, dependencies, build config fields
- `res/layout/` — activity and fragment layouts
- `res/navigation/` — role-based nav graphs
- `res/menu/` — bottom nav and toolbar menu layouts
- `res/drawable/` — vector icons and shape drawables

## Feature summary
### Student
- Dashboard summary
- Mark attendance workflows
- Attendance history
- Requests and notifications

### Teacher
- Start and stop sessions
- Manual attendance
- Active session management
- Student list and reports
- Request review

### Admin
- System analytics
- User, class, subject management
- Audit logs

## Notes
- The Android app is intended to work with the backend API at
  `http://localhost:5000` in development.
- For production, update the base URL to your hosted API endpoint.
