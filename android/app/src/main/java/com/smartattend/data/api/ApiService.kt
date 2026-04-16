package com.smartattend.data.api

import com.smartattend.domain.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ─── AUTH ──────────────────────────────────────────────────────────────────
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<User>

    @PUT("auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<MessageResponse>

    @PUT("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<MessageResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<MessageResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<VerifyOtpResponse>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    @PUT("auth/profile-photo")
    suspend fun updateProfilePhoto(@Body request: UpdateProfilePhotoRequest): Response<UpdateProfilePhotoResponse>

    @PUT("auth/fcm-token")
    suspend fun updateFcmToken(@Body request: FcmTokenRequest): Response<MessageResponse>

    // ─── STUDENT ───────────────────────────────────────────────────────────────
    @GET("student/dashboard")
    suspend fun getStudentDashboard(): Response<StudentDashboard>

    @GET("student/attendance")
    suspend fun getStudentAttendance(
        @Query("subject_id") subjectId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("semester") semester: Int? = null,
        @Query("session") session: String? = null
    ): Response<AttendanceListResponse>

    @GET("student/subjects")
    suspend fun getStudentSubjects(): Response<SubjectsResponse>

    @GET("student/sessions/active")
    suspend fun getActiveSessions(): Response<SessionsResponse>

    @POST("student/attendance/mark")
    suspend fun markAttendance(@Body request: MarkAttendanceRequest): Response<MarkAttendanceResponse>

    @GET("student/requests")
    suspend fun getAttendanceRequests(): Response<RequestsResponse>

    @POST("student/requests")
    suspend fun submitRequest(@Body request: AttendanceRequestBody): Response<MessageResponse>

    @GET("student/notifications")
    suspend fun getNotifications(): Response<NotificationsResponse>

    @PUT("student/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<MessageResponse>

    @PUT("student/notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<MessageResponse>

    // ─── TEACHER ───────────────────────────────────────────────────────────────
    @GET("teacher/dashboard")
    suspend fun getTeacherDashboard(): Response<TeacherDashboard>

    @GET("teacher/subjects")
    suspend fun getTeacherSubjects(): Response<SubjectsResponse>

    @GET("teacher/students")
    suspend fun getTeacherStudents(
        @Query("search") search: String? = null,
        @Query("subject_id") subjectId: String? = null,
        @Query("class_id") classId: String? = null
    ): Response<StudentsResponse>

    @POST("teacher/students")
    suspend fun createTeacherStudent(@Body request: TeacherCreateStudentRequest): Response<CreateResponse>

    @PUT("teacher/students/{id}")
    suspend fun updateTeacherStudent(@Path("id") id: String, @Body request: TeacherUpdateStudentRequest): Response<MessageResponse>

    @DELETE("teacher/students/{id}")
    suspend fun deleteTeacherStudent(@Path("id") id: String): Response<MessageResponse>

    @GET("teacher/attendance/low-shortlist")
    suspend fun getLowAttendanceStudents(@Query("threshold") threshold: Int? = null): Response<LowAttendanceResponse>

    @GET("teacher/attendance/low-shortlist")
    suspend fun getShortlist(
        @Query("subject_id") subjectId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("threshold") threshold: Int? = null,
        @Query("search") search: String? = null
    ): Response<ShortlistResponse>

    @POST("teacher/sessions")
    suspend fun createSession(@Body request: CreateSessionRequest): Response<SessionResponse>

    @GET("teacher/sessions")
    suspend fun getTeacherSessions(): Response<SessionsResponse>

    @GET("teacher/sessions/active")
    suspend fun getTeacherActiveSessions(): Response<SessionsResponse>

    @DELETE("teacher/sessions/{id}")
    suspend fun stopSession(@Path("id") id: String): Response<MessageResponse>

    @POST("teacher/attendance/manual")
    suspend fun saveManualAttendance(@Body request: ManualAttendanceRequest): Response<MessageResponse>

    @GET("teacher/attendance")
    suspend fun getTeacherAttendance(
        @Query("subject_id") subjectId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("student_id") studentId: String? = null
    ): Response<AttendanceListResponse>

    @GET("teacher/attendance/report")
    suspend fun getAttendanceReport(
        @Query("subject_id") subjectId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("semester") semester: Int? = null,
        @Query("session") session: String? = null
    ): Response<AttendanceReportResponse>

    @GET("teacher/attendance/pivot-report")
    suspend fun getPivotReport(
        @Query("subject_id") subjectId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("semester") semester: Int? = null,
        @Query("session") session: String? = null
    ): Response<PivotReportResponse>

    @GET("teacher/requests")
    suspend fun getTeacherRequests(@Query("status") status: String? = null): Response<RequestsResponse>

    @PUT("teacher/requests/{id}")
    suspend fun reviewRequest(
        @Path("id") id: String,
        @Body request: ReviewRequestBody
    ): Response<MessageResponse>

    @POST("teacher/alerts")
    suspend fun sendAlert(@Body request: AlertRequest): Response<MessageResponse>

    // ─── ADMIN ─────────────────────────────────────────────────────────────────
    @GET("admin/stats")
    suspend fun getAdminStats(): Response<AdminStats>

    @GET("admin/students")
    suspend fun getAdminStudents(
        @Query("search") search: String? = null,
        @Query("class_id") classId: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): Response<StudentsResponse>

    @POST("admin/students")
    suspend fun createStudent(@Body request: CreateStudentRequest): Response<CreateResponse>

    @PUT("admin/students/{id}")
    suspend fun updateStudent(@Path("id") id: String, @Body request: UpdateStudentRequest): Response<MessageResponse>

    @DELETE("admin/students/{id}")
    suspend fun deleteStudent(@Path("id") id: String): Response<MessageResponse>

    @GET("admin/teachers")
    suspend fun getAdminTeachers(@Query("search") search: String? = null): Response<TeachersResponse>

    @POST("admin/teachers")
    suspend fun createTeacher(@Body request: CreateTeacherRequest): Response<CreateResponse>

    @PUT("admin/teachers/{id}")
    suspend fun updateTeacher(@Path("id") id: String, @Body request: UpdateTeacherRequest): Response<MessageResponse>

    @DELETE("admin/teachers/{id}")
    suspend fun deleteTeacher(@Path("id") id: String): Response<MessageResponse>

    @GET("admin/classes")
    suspend fun getClasses(): Response<ClassesResponse>

    @POST("admin/classes")
    suspend fun createClass(@Body request: CreateClassRequest): Response<CreateResponse>

    @PUT("admin/classes/{id}")
    suspend fun updateClass(@Path("id") id: String, @Body request: UpdateClassRequest): Response<MessageResponse>

    @DELETE("admin/classes/{id}")
    suspend fun deleteClass(@Path("id") id: String): Response<MessageResponse>

    @GET("admin/branches")
    suspend fun getBranches(): Response<BranchesResponse>

    @POST("admin/branches")
    suspend fun createBranch(@Body request: CreateBranchRequest): Response<Branch>

    @GET("admin/subjects")
    suspend fun getAdminSubjects(
        @Query("class_id") classId: String? = null,
        @Query("search") search: String? = null
    ): Response<SubjectsResponse>

    @POST("admin/subjects")
    suspend fun createSubject(@Body request: CreateSubjectRequest): Response<CreateResponse>

    @PUT("admin/subjects/{id}")
    suspend fun updateSubject(@Path("id") id: String, @Body request: UpdateSubjectRequest): Response<MessageResponse>

    @DELETE("admin/subjects/{id}")
    suspend fun deleteSubject(@Path("id") id: String): Response<MessageResponse>

    @GET("admin/reports")
    suspend fun getAdminReports(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("class_id") classId: String? = null,
        @Query("subject_id") subjectId: String? = null,
        @Query("student_id") studentId: String? = null,
        @Query("semester") semester: Int? = null,
        @Query("session") session: String? = null
    ): Response<AttendanceListResponse>

    @GET("admin/analytics")
    suspend fun getAnalytics(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<AnalyticsResponse>

    @GET("admin/audit-logs")
    suspend fun getAuditLogs(): Response<AuditLogsResponse>

    @GET("admin/anomalies")
    suspend fun getAnomalies(): Response<AnomaliesResponse>

    @GET("admin/sessions")
    suspend fun getAdminSessions(
        @Query("teacher_id") teacherId: String? = null,
        @Query("subject_id") subjectId: String? = null,
        @Query("date") date: String? = null
    ): Response<SessionsResponse>

    @DELETE("admin/sessions/{id}")
    suspend fun forceStopSession(@Path("id") id: String): Response<MessageResponse>

    // ─── ACADEMIC SESSIONS ────────────────────────────────────────────────────
    @GET("admin/academic-sessions")
    suspend fun getAcademicSessions(): Response<AcademicSessionsResponse>

    @POST("admin/academic-sessions")
    suspend fun createAcademicSession(@Body request: CreateAcademicSessionRequest): Response<AcademicSession>

    @PUT("admin/academic-sessions/{id}/activate")
    suspend fun activateAcademicSession(@Path("id") id: String): Response<MessageResponse>

    // ─── STUDENT PROMOTION ────────────────────────────────────────────────────
    @POST("admin/promote")
    suspend fun promoteStudents(@Body request: PromoteRequest): Response<PromoteResponse>
}
