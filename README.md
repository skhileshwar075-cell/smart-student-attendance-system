# SmartAttend – Smart Secure Student Attendance Management System

## Microsoft Build AI Hackathon 2026

**Theme:** AI at Work – Productivity & Teamwork

### Live Demo

Frontend:

`https://smart-student-attendance-system-ten.vercel.app`

Backend API:

`https://smart-student-attendance-system.onrender.com`

---

# Project Overview

SmartAttend is a secure attendance management platform designed to eliminate proxy attendance using multiple verification layers.

Unlike traditional attendance systems that rely only on QR codes or manual marking, SmartAttend combines:

- Face Verification

- GPS Geo-Fencing

- Session-Based Authentication

- Role-Based Access Control

- Real-Time Monitoring

to ensure authentic student presence and reduce attendance fraud.

The platform supports:

- Admin Dashboard

- Teacher Dashboard

- Student Dashboard

- Android Application

- Real-Time Notifications

- Attendance Analytics

---

# Problem Statement

Educational institutions often face:

- Proxy attendance

- Manual attendance errors

- Lack of real-time monitoring

- Poor attendance analytics

- Security vulnerabilities in QR-only systems

SmartAttend addresses these challenges through multi-layer verification and automated workflows.

---

# Key Features

### Authentication & Security

- JWT Authentication

- Role-Based Access Control (RBAC)

- Password Reset via OTP

- Rate Limiting

- Helmet Security Middleware

### Attendance Verification

- QR Attendance

- Session Code Attendance

- Face Verification

- GPS Validation

- Manual Attendance

### Management

- Student Management

- Teacher Management

- Class Management

- Subject Management

- Academic Sessions

### Analytics

- Attendance Trends

- Attendance Reports

- Dashboard Insights

- Real-Time Updates

### Notifications

- In-App Notifications

- Socket.IO Real-Time Events

---

# Technology Stack

## Frontend

- React.js

- Vite

- Tailwind CSS

- Axios

- Recharts

- TensorFlow.js

## Backend

- Node.js

- Express.js

- PostgreSQL

- JWT

- Socket.IO

- bcryptjs

## Android

- Kotlin

- MVVM Architecture

- CameraX

- ML Kit

- Retrofit

## Database

- PostgreSQL 16

Based on your project documentation.

---

# System Architecture
SmartAttend uses a multi-client architecture with a centralized backend
and shared PostgreSQL storage.

- Frontend: React + Vite web app provides role-based dashboards for Admin,
  Teacher, and Student users. It runs locally on port 5173 in development
  and proxies `/api` requests to the backend on port 5000.
- Android App: Native Kotlin client supports QR/code scanning, face
  detection, GPS validation, attendance viewing, and push notifications.
- Backend: Node.js + Express serves RESTful APIs, handles authentication
  (JWT), attendance business logic, face verification logging, and
  session security.
- Database: PostgreSQL stores users, branches, classes, students,
  attendance sessions, records, notifications, audit logs, and anomaly
  logs.
- Real-time Layer: Socket.IO enables live session updates, notification
  broadcasts, and active attendance state changes. Firebase Cloud
  Messaging is optional for push notifications.
```
React Web App
       │
       ▼
Node.js + Express API
       │
       ▼
PostgreSQL Database
       │
       ▼
Socket.IO Real-Time Layer

Android App
       │
       └────► Same API
```

### Workflow

1. Student joins attendance session.

2. QR/Code verification performed.

3. Face verification executed.

4. GPS location validated.

5. Attendance stored in PostgreSQL.

6. Real-time updates sent via Socket.IO.

---

# AI Components

SmartAttend integrates AI technologies to improve attendance authenticity.

### TensorFlow.js

Used for:

- Face Detection

- Face Embedding Generation

- Face Matching

### Google ML Kit

Used in Android application for:

- Face Detection

- Camera Processing

### Attendance Anomaly Detection

Used to identify suspicious attendance patterns and potential proxy attendance attempts.

---

# AI Tools Used During Development

The project was developed with assistance from modern AI-powered development tools:

- GitHub Copilot

- ChatGPT (OpenAI)

- Microsoft Copilot

These tools assisted in:

- Code generation

- Refactoring

- Debugging

- Documentation

- Architecture planning

- Deployment troubleshooting

All final design decisions, implementation, testing, deployment, and project ownership remain with the project creator.

---

# Team Information

## Khileshwar Sahu

**Role:** Solo Developer & Project Creator

### Responsibilities

- Full Stack Development

- React Frontend Development

- Node.js Backend Development

- PostgreSQL Database Design

- Android Application Development

- Security Implementation

- AI Integration

- Testing & Debugging

- Cloud Deployment

- Technical Documentation

---

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
├── Khileshwar_Deck.pdf    ← Project slide deck
└── android/ANDROID_GUIDE.md ← Android app developer guide
```

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


# Demo Credentials
Admin
admin@smartattend.edu
Admin@123

Teacher
priya@smartattend.edu
Teacher@123

Student
aarav@smartattend.edu
Student@123
# Documentation
- `project_setup.txt` — Setup and configuration details
- `project_documentation.txt` — Architecture, API, and feature overview
- `START_STOP_GUIDE.md` — Start/stop commands and port troubleshooting
- `Khileshwar_Deck.pdf` Deck content (10+8 slides)