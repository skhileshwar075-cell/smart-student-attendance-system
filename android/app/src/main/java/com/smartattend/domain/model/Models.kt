package com.smartattend.domain.model

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

// ─── AUTH ─────────────────────────────────────────────────────────────────────

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(
    val token: String,
    val user: User
)

@Parcelize
data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val phone: String?,
    @SerializedName("profile_photo") val profilePhoto: String?,
    @SerializedName("profile_id") val profileId: String?,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("teacher_code") val teacherCode: String?,
    @SerializedName("current_semester") val currentSemester: Int? = null,
    @SerializedName("current_session") val currentSession: String? = null
) : Parcelable

data class UpdateProfileRequest(val name: String, val phone: String)
data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String
)
data class FcmTokenRequest(val token: String)
data class RegisterRequest(val name: String, val email: String, val password: String, val role: String)
data class ForgotPasswordRequest(val email: String)
data class VerifyOtpRequest(val email: String, @SerializedName("otp_code") val otpCode: String)
data class VerifyOtpResponse(val message: String, @SerializedName("reset_token") val resetToken: String)
data class ResetPasswordRequest(@SerializedName("reset_token") val resetToken: String, @SerializedName("new_password") val newPassword: String)

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

@Parcelize
data class AttendanceRecord(
    val id: String,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("subject_id") val subjectId: String,
    val date: String,
    val status: String,
    val method: String?,
    @SerializedName("face_verified") val faceVerified: Boolean?,
    @SerializedName("anomaly_flag") val anomalyFlag: Boolean?,
    @SerializedName("student_name") val studentName: String?,
    @SerializedName("subject_name") val subjectName: String?,
    @SerializedName("subject_code") val subjectCode: String?,
    @SerializedName("student_code") val studentCode: String?
) : Parcelable

data class AttendanceListResponse(val records: List<AttendanceRecord>)

data class MarkAttendanceRequest(
    @SerializedName("session_id") val sessionId: String?,
    val code: String?,
    @SerializedName("geo_lat") val geoLat: Double?,
    @SerializedName("geo_lng") val geoLng: Double?,
    @SerializedName("face_verified") val faceVerified: Boolean,
    @SerializedName("anomaly_data") val anomalyData: AnomalyData? = null
)

data class AnomalyData(
    @SerializedName("repeated_attempts") val repeatedAttempts: Int = 0,
    @SerializedName("location_mismatch") val locationMismatch: Boolean = false,
    val confidence: Double = 0.0
)

data class MarkAttendanceResponse(
    val message: String,
    @SerializedName("face_verified") val faceVerified: Boolean?,
    @SerializedName("anomaly_flag") val anomalyFlag: Boolean?
)

data class ManualAttendanceRequest(
    @SerializedName("subject_id") val subjectId: String,
    val date: String?,
    val records: List<AttendanceRecordInput>
)

data class AttendanceRecordInput(
    @SerializedName("student_id") val studentId: String,
    val status: String
)

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

@Parcelize
data class Subject(
    val id: String,
    val name: String,
    val code: String,
    val credits: Int,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("teacher_id") val teacherId: String?,
    @SerializedName("class_name") val className: String?,
    @SerializedName("class_section") val classSection: String?,
    @SerializedName("teacher_name") val teacherName: String?,
    @SerializedName("total_classes") val totalClasses: Int?,
    @SerializedName("present_count") val presentCount: Int?,
    val percentage: Double?,
    val semester: Int? = null,
    @SerializedName("branch_name") val branchName: String? = null
) : Parcelable

data class SubjectsResponse(val subjects: List<Subject>)

// ─── SESSIONS ─────────────────────────────────────────────────────────────────

@Parcelize
data class AttendanceSession(
    val id: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("teacher_id") val teacherId: String?,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("session_type") val sessionType: String,
    val code: String?,
    @SerializedName("qr_data") val qrData: String?,
    @SerializedName("expires_at") val expiresAt: String,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("session_date") val sessionDate: String?,
    @SerializedName("geo_lat") val geoLat: Double?,
    @SerializedName("geo_lng") val geoLng: Double?,
    @SerializedName("geo_radius") val geoRadius: Int?,
    @SerializedName("subject_name") val subjectName: String?,
    @SerializedName("subject_code") val subjectCode: String?,
    @SerializedName("class_name") val className: String?,
    @SerializedName("class_section") val classSection: String?,
    @SerializedName("teacher_name") val teacherName: String?,
    val status: String? = null
) : Parcelable

data class SessionsResponse(val sessions: List<AttendanceSession>)

data class CreateSessionRequest(
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("session_type") val type: String,
    @SerializedName("geo_lat") val geoLat: Double?,
    @SerializedName("geo_lng") val geoLng: Double?,
    @SerializedName("geo_radius") val geoRadius: Int?
)

data class SessionResponse(
    val id: String,
    val code: String?,
    @SerializedName("qr_data") val qrData: String?,
    @SerializedName("expires_at") val expiresAt: String,
    @SerializedName("session_type") val sessionType: String?
)

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

@Parcelize
data class Student(
    val id: String,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("roll_number") val rollNumber: String?,
    @SerializedName("class_id") val classId: String?,
    val name: String,
    val email: String,
    val phone: String?,
    @SerializedName("class_name") val className: String?,
    @SerializedName("class_section") val classSection: String?,
    @SerializedName("is_active") val isActive: Boolean?,
    @SerializedName("profile_photo") val profilePhoto: String?,
    @SerializedName("current_semester") val currentSemester: Int? = null,
    @SerializedName("current_session") val currentSession: String? = null
) : Parcelable

data class StudentsResponse(val students: List<Student>, val total: Int? = null)

data class CreateStudentRequest(
    val name: String, val email: String, val phone: String,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("roll_number") val rollNumber: String,
    val password: String?
)

data class UpdateStudentRequest(
    val name: String, val email: String, val phone: String,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("roll_number") val rollNumber: String,
    @SerializedName("is_active") val isActive: Boolean
)

// ─── TEACHERS ─────────────────────────────────────────────────────────────────

@Parcelize
data class Teacher(
    val id: String,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("teacher_id") val teacherId: String,
    val department: String?,
    val designation: String?,
    val name: String,
    val email: String,
    val phone: String?,
    @SerializedName("is_active") val isActive: Boolean?
) : Parcelable

data class TeachersResponse(val teachers: List<Teacher>)

data class CreateTeacherRequest(
    val name: String, val email: String, val phone: String,
    @SerializedName("teacher_id") val teacherId: String,
    val department: String, val designation: String,
    val password: String?
)

data class UpdateTeacherRequest(
    val name: String, val email: String, val phone: String,
    val department: String, val designation: String,
    @SerializedName("is_active") val isActive: Boolean
)

// ─── CLASSES ──────────────────────────────────────────────────────────────────

@Parcelize
data class SchoolClass(
    val id: String,
    val name: String,
    val section: String?,
    @SerializedName("branch_id") val branchId: String?,
    @SerializedName("branch_name") val branchName: String?,
    val semester: Int?,
    @SerializedName("academic_year") val academicYear: String?,
    @SerializedName("student_count") val studentCount: Int?
) : Parcelable

data class ClassesResponse(val classes: List<SchoolClass>)

data class CreateClassRequest(
    val name: String, val section: String?,
    @SerializedName("branch_id") val branchId: String?,
    val semester: Int, @SerializedName("academic_year") val academicYear: String
)

data class UpdateClassRequest(
    val name: String, val section: String?,
    @SerializedName("branch_id") val branchId: String?,
    val semester: Int, @SerializedName("academic_year") val academicYear: String
)

// ─── BRANCHES ─────────────────────────────────────────────────────────────────

@Parcelize
data class Branch(
    val id: String,
    val name: String,
    val code: String
) : Parcelable

data class BranchesResponse(val branches: List<Branch>)

data class CreateBranchRequest(val name: String, val code: String)

// ─── SUBJECTS (Admin) ─────────────────────────────────────────────────────────

data class CreateSubjectRequest(
    val name: String, val code: String,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("teacher_id") val teacherId: String?,
    val credits: Int
)

data class UpdateSubjectRequest(
    val name: String, val code: String,
    @SerializedName("class_id") val classId: String?,
    @SerializedName("teacher_id") val teacherId: String?,
    val credits: Int
)

// ─── ATTENDANCE REQUESTS ──────────────────────────────────────────────────────

@Parcelize
data class AttendanceRequest(
    val id: String,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("subject_id") val subjectId: String,
    val date: String,
    val reason: String,
    val status: String,
    @SerializedName("teacher_note") val teacherNote: String?,
    @SerializedName("student_name") val studentName: String?,
    @SerializedName("subject_name") val subjectName: String?,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("created_at") val createdAt: String?
) : Parcelable

data class RequestsResponse(val requests: List<AttendanceRequest>)
data class AttendanceRequestBody(
    @SerializedName("subject_id") val subjectId: String,
    val date: String,
    val reason: String
)
data class ReviewRequestBody(val status: String, @SerializedName("teacher_note") val teacherNote: String?)

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

@Parcelize
data class Notification(
    val id: String,
    @SerializedName("user_id") val userId: String,
    val title: String,
    val message: String,
    val type: String,
    @SerializedName("is_read") val isRead: Boolean,
    @SerializedName("created_at") val createdAt: String
) : Parcelable

data class NotificationsResponse(val notifications: List<Notification>)

// ─── DASHBOARDS ───────────────────────────────────────────────────────────────

data class StudentDashboard(
    val subjects: List<Subject>?,
    @SerializedName("total_classes") val totalClasses: Int?,
    @SerializedName("present_count") val presentCount: Int?,
    @SerializedName("overall_percentage") val overallPercentage: Int?,
    @SerializedName("recent_attendance") val recentAttendance: List<RecentAttendance>?,
    val notifications: List<Notification>?
)

data class RecentAttendance(
    val date: String?,
    val status: String?,
    @SerializedName("subject_name") val subjectName: String?
)

data class TeacherDashboard(
    val subjects: List<Subject>?,
    @SerializedName("today_stats") val todayStats: TodayStats?,
    @SerializedName("pending_requests") val pendingRequests: Int?
)

data class TodayStats(val present: Int, val absent: Int, val total: Int)

data class AdminStats(
    @SerializedName("total_students") val totalStudents: Int,
    @SerializedName("total_teachers") val totalTeachers: Int,
    @SerializedName("total_classes") val totalClasses: Int,
    @SerializedName("total_subjects") val totalSubjects: Int,
    @SerializedName("present_today") val presentToday: Int,
    @SerializedName("absent_today") val absentToday: Int
)

// ─── REPORTS / ANALYTICS ──────────────────────────────────────────────────────

data class AttendanceReportRow(
    @SerializedName("student_id") val studentId: String,
    val name: String,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("roll_number") val rollNumber: String?,
    @SerializedName("total_classes") val totalClasses: Int,
    @SerializedName("present_count") val presentCount: Int,
    @SerializedName("absent_count") val absentCount: Int,
    val percentage: Double
)

data class AttendanceReportResponse(val report: List<AttendanceReportRow>)

data class PivotReportRow(
    val name: String,
    @SerializedName("roll_number") val rollNumber: String?,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("date_values") val dateValues: List<String>,
    @SerializedName("total_classes") val totalClasses: Int,
    @SerializedName("present_count") val presentCount: Int,
    @SerializedName("absent_count") val absentCount: Int,
    val percentage: Double
)

data class PivotReportResponse(val dates: List<String>, val report: List<PivotReportRow>)

data class AnalyticsResponse(
    val trend: List<TrendPoint>?,
    @SerializedName("low_attendance") val lowAttendance: List<LowAttendanceStudent>?,
    @SerializedName("subject_stats") val subjectStats: List<SubjectStat>?,
    @SerializedName("anomaly_count") val anomalyCount: Int?
)

data class TrendPoint(val date: String, val present: Int, val absent: Int, val late: Int?)
data class LowAttendanceStudent(
    val id: String?, // Added for alert sending
    val name: String,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("class_name") val className: String?,
    val section: String?,
    val percentage: Double
)
data class SubjectStat(val name: String, val code: String, @SerializedName("avg_attendance") val avgAttendance: Double)

// ─── ANOMALIES ────────────────────────────────────────────────────────────────

data class Anomaly(
    val id: String,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("flag_type") val flagType: String,
    val description: String?,
    val confidence: Double?,
    val resolved: Boolean,
    @SerializedName("student_name") val studentName: String?,
    @SerializedName("subject_name") val subjectName: String?,
    @SerializedName("created_at") val createdAt: String
)
data class AnomaliesResponse(val anomalies: List<Anomaly>)

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

data class AuditLog(
    val id: String,
    @SerializedName("user_id") val userId: String?,
    val action: String,
    val details: Any?,
    @SerializedName("user_name") val userName: String?,
    @SerializedName("created_at") val createdAt: String
)
data class AuditLogsResponse(val logs: List<AuditLog>)

// ─── ACADEMIC SESSIONS ────────────────────────────────────────────────────────

data class AcademicSession(
    val id: String,
    val name: String,
    @SerializedName("start_date") val startDate: String,
    @SerializedName("end_date") val endDate: String,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("created_at") val createdAt: String?
)

data class AcademicSessionsResponse(val sessions: List<AcademicSession>)

data class CreateAcademicSessionRequest(
    val name: String,
    @SerializedName("start_date") val startDate: String,
    @SerializedName("end_date") val endDate: String,
    @SerializedName("is_active") val isActive: Boolean = false
)

data class PromoteRequest(
    @SerializedName("new_session") val newSession: String,
    @SerializedName("class_id") val classId: String? = null,
    @SerializedName("max_semester") val maxSemester: Int = 8
)

data class PromoteResponse(
    val promoted: Int,
    @SerializedName("new_session") val newSession: String,
    val message: String
)

// ─── GENERIC ──────────────────────────────────────────────────────────────────

data class MessageResponse(val message: String)
data class CreateResponse(val id: String, val message: String)
data class AlertRequest(
    @SerializedName("student_id") val studentId: String,
    val message: String? = null,
    @SerializedName("subject_id") val subjectId: String? = null,
    @SerializedName("attendance_pct") val attendancePct: Double? = null
)

data class TeacherCreateStudentRequest(
    val name: String,
    val email: String,
    val phone: String?,
    @SerializedName("roll_number") val rollNumber: String?,
    val password: String? = null
)

data class TeacherUpdateStudentRequest(
    val name: String,
    val email: String,
    val phone: String?,
    @SerializedName("roll_number") val rollNumber: String?
)

data class LowAttendanceResponse(val students: List<LowAttendanceStudent>)

data class ShortlistStudentItem(
    @SerializedName("student_id") val studentId: String,
    val name: String,
    @SerializedName("student_code") val studentCode: String?,
    @SerializedName("roll_number") val rollNumber: String?,
    val phone: String?,
    @SerializedName("class_name") val className: String?,
    val section: String?,
    @SerializedName("total_classes") val totalClasses: Int,
    @SerializedName("present_count") val presentCount: Int,
    @SerializedName("absent_count") val absentCount: Int,
    val percentage: Double
)

data class ShortlistResponse(val students: List<ShortlistStudentItem>, val threshold: Double)
