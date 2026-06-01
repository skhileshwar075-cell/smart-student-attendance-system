# Smart Attendance — Android WebView Wrapper

This folder contains an optional Android WebView wrapper that loads the
hosted SmartAttend web application inside a native shell.

> The main native Android client is located in the top-level `android/`
directory. This wrapper is an additional project for WebView-based delivery.

## What it provides
- A WebView that loads the live website
- Cookie persistence for login sessions
- Download support via `DownloadManager`
- External link handling for `mailto:`, `tel:`, and browser URLs
- Pull-to-refresh support
- Strict HTTPS enforcement and SSL error rejection

## Setup
1. Open Android Studio.
2. Select `Open` and choose `smartAttendance-Android/`.
3. Wait for Gradle sync to finish.

## Run
- Start an emulator or connect a device.
- Run the app from Android Studio.

## Change the loaded URL
Edit `MainActivity.kt` and update `BASE_URL`.

## Notes
- This wrapper is useful when you want a fast mobile release of the web app.
- Production should use the native Kotlin client in `android/` for better
  offline, camera, and location support.
