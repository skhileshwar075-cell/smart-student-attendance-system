# Smart Secure Student Attendance Management System (SmartAttend)

**Version 3.1** | May 2026

A production-ready, multi-platform attendance management system that replaces traditional paper-based methods with secure digital tracking.

## 🚀 Features

- **Multi-Role Support**: Admin, Teacher, Student dashboards
- **Secure Attendance**: QR codes, alphanumeric codes, face verification, GPS geo-fencing
- **Real-time Updates**: Socket.IO notifications and live session management
- **Responsive Design**: Works on all devices (recently updated for mobile)
- **Holiday Support**: Mark holidays for entire subjects (recently added)
- **Analytics**: Comprehensive reports, anomaly detection, audit trails
- **Cross-Platform**: Web (React) + Android (Kotlin) apps

## 🛠 Tech Stack

- **Backend**: Node.js 20, Express 4, PostgreSQL 16, JWT, Socket.IO
- **Frontend**: React 18, Vite 5, TailwindCSS 3, TensorFlow.js
- **Mobile**: Kotlin, MVVM, Hilt, Retrofit 2, ML Kit
- **Security**: Helmet.js, rate limiting, bcryptjs, input validation

## 📁 Project Structure

```
/
├── server/          # Node.js/Express backend
├── client/          # React frontend
├── android/         # Kotlin Android app
├── project_documentation.txt  # Detailed docs
├── project_setup.txt         # Setup guide
├── START_STOP_GUIDE.md       # Quick start/stop
└── android/ANDROID_GUIDE.md  # Android dev guide
```

## 🏁 Quick Start

1. **Prerequisites**: Node.js 20, PostgreSQL 16, Android Studio (for mobile)

2. **Setup Database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE smartattend;"
   ```

3. **Environment Variables**:
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/smartattend"
   export JWT_SECRET="your-strong-secret"
   ```

4. **Install & Run**:
   ```bash
   npm install
   cd client && npm install && cd ..
   node server/index.js  # Backend on port 5000
   # In another terminal:
   cd client && npm run dev  # Frontend on port 5173
   ```

5. **Demo Credentials**:
   - Admin: admin@smartattend.edu / Admin@123
   - Teacher: priya@smartattend.edu / Teacher@123
   - Student: aarav@smartattend.edu / Student@123

## 📖 Documentation

- [Project Documentation](project_documentation.txt) — Complete feature overview
- [Setup Guide](project_setup.txt) — Detailed installation
- [Start/Stop Guide](START_STOP_GUIDE.md) — Running the project
- [Android Guide](android/ANDROID_GUIDE.md) — Mobile development

## 🔄 Recent Updates (v3.1)

- ✅ Fixed holiday marking server error (database schema updated)
- ✅ Made student attendance calendar responsive on all devices
- ✅ Enhanced UI without breaking existing functionality

## 📄 License

This project is for educational and demonstration purposes.

---

**SmartAttend** — Secure, efficient, and user-friendly attendance management.</content>