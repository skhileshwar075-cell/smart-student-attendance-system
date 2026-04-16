import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import HomePage from './pages/HomePage';
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import MarkAttendance from './pages/student/MarkAttendance';
import AttendanceRequests from './pages/student/Requests';
import NotificationsPage from './pages/Notifications';
import StudentProfile from './pages/student/Profile';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherStudents from './pages/teacher/Students';
import TakeAttendance from './pages/teacher/TakeAttendance';
import TeacherActiveSessions from './pages/teacher/ActiveSessions';
import TeacherRecords from './pages/teacher/Records';
import TeacherReports from './pages/teacher/Reports';
import TeacherRequests from './pages/teacher/Requests';
import TeacherProfile from './pages/teacher/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProfile from './pages/admin/Profile';
import ManageStudents from './pages/admin/ManageStudents';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageClasses from './pages/admin/ManageClasses';
import ManageSubjects from './pages/admin/ManageSubjects';
import AdminReports from './pages/admin/Reports';
import Analytics from './pages/admin/Analytics';
import AttendanceAnalytics from './pages/admin/AttendanceAnalytics';
import AuditLogs from './pages/admin/AuditLogs';
import DevicePreview from './pages/admin/DevicePreview';
import AcademicSessions from './pages/admin/AcademicSessions';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute roles={['student']}><StudentAttendance /></ProtectedRoute>} />
          <Route path="/student/mark" element={<ProtectedRoute roles={['student']}><MarkAttendance /></ProtectedRoute>} />
          <Route path="/student/requests" element={<ProtectedRoute roles={['student']}><AttendanceRequests /></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute roles={['student']}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><StudentProfile /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherStudents /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute roles={['teacher', 'admin']}><TakeAttendance /></ProtectedRoute>} />
          <Route path="/teacher/sessions" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherActiveSessions /></ProtectedRoute>} />
          <Route path="/teacher/records" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherRecords /></ProtectedRoute>} />
          <Route path="/teacher/reports" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherReports /></ProtectedRoute>} />
          <Route path="/teacher/requests" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherRequests /></ProtectedRoute>} />
          <Route path="/teacher/notifications" element={<ProtectedRoute roles={['teacher', 'admin']}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/teacher/profile" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute roles={['admin']}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute roles={['admin']}><AdminProfile /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><ManageStudents /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><ManageTeachers /></ProtectedRoute>} />
          <Route path="/admin/classes" element={<ProtectedRoute roles={['admin']}><ManageClasses /></ProtectedRoute>} />
          <Route path="/admin/subjects" element={<ProtectedRoute roles={['admin']}><ManageSubjects /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>} />
          <Route path="/admin/attendance-analytics" element={<ProtectedRoute roles={['admin']}><AttendanceAnalytics /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/admin/device-preview" element={<ProtectedRoute roles={['admin']}><DevicePreview /></ProtectedRoute>} />
          <Route path="/admin/academic-sessions" element={<ProtectedRoute roles={['admin']}><AcademicSessions /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
