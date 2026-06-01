package com.smartattend.data.repository

import com.smartattend.data.api.ApiService
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepository @Inject constructor(private val api: ApiService) {

    suspend fun getStats() = safeCall { api.getAdminStats() }

    suspend fun getStudents(search: String? = null, classId: String? = null) =
        safeCall { api.getAdminStudents(search, classId) }

    suspend fun createStudent(req: CreateStudentRequest) = safeCall { api.createStudent(req) }

    suspend fun updateStudent(id: String, req: UpdateStudentRequest) =
        safeCall { api.updateStudent(id, req) }

    suspend fun deleteStudent(id: String) = safeCall { api.deleteStudent(id) }

    suspend fun getTeachers(search: String? = null) = safeCall { api.getAdminTeachers(search) }

    suspend fun createTeacher(req: CreateTeacherRequest) = safeCall { api.createTeacher(req) }

    suspend fun updateTeacher(id: String, req: UpdateTeacherRequest) =
        safeCall { api.updateTeacher(id, req) }

    suspend fun deleteTeacher(id: String) = safeCall { api.deleteTeacher(id) }

    suspend fun getClasses() = safeCall { api.getClasses() }

    suspend fun createClass(req: CreateClassRequest) = safeCall { api.createClass(req) }

    suspend fun updateClass(id: String, req: UpdateClassRequest) =
        safeCall { api.updateClass(id, req) }

    suspend fun deleteClass(id: String) = safeCall { api.deleteClass(id) }

    suspend fun getBranches() = safeCall { api.getBranches() }

    suspend fun getSubjects(classId: String? = null, search: String? = null) =
        safeCall { api.getAdminSubjects(classId, search) }

    suspend fun createSubject(req: CreateSubjectRequest) = safeCall { api.createSubject(req) }

    suspend fun updateSubject(id: String, req: UpdateSubjectRequest) =
        safeCall { api.updateSubject(id, req) }

    suspend fun deleteSubject(id: String) = safeCall { api.deleteSubject(id) }

    suspend fun getAnalytics(from: String? = null, to: String? = null) =
        safeCall { api.getAnalytics(from, to) }

    suspend fun getReports(
        from: String? = null,
        to: String? = null,
        classId: String? = null,
        subjectId: String? = null,
        studentId: String? = null,
        semester: Int? = null,
        session: String? = null
    ) = safeCall { api.getAdminReports(from, to, classId, subjectId, studentId, semester, session) }

    suspend fun getPivotReport(
        from: String? = null,
        to: String? = null,
        classId: String? = null,
        subjectId: String? = null
    ) = safeCall { api.getAdminPivotReport(from, to, classId, subjectId) }

    suspend fun getLowAttendanceShortlist(
        classId: String? = null,
        subjectId: String? = null,
        from: String? = null,
        to: String? = null,
        threshold: Int? = null,
        search: String? = null
    ) = safeCall { api.getAdminLowAttendanceShortlist(classId, subjectId, from, to, threshold, search) }

    suspend fun getNotifications() = safeCall { api.getNotifications() }

    suspend fun markNotificationRead(id: String) = safeCall { api.markNotificationRead(id) }

    suspend fun markAllNotificationsRead() = safeCall { api.markAllNotificationsRead() }

    suspend fun getAuditLogs() = safeCall { api.getAuditLogs() }

    suspend fun getAnomalies() = safeCall { api.getAnomalies() }

    suspend fun getSessions(teacherId: String? = null, subjectId: String? = null, date: String? = null) =
        safeCall { api.getAdminSessions(teacherId, subjectId, date) }

    suspend fun forceStopSession(id: String) = safeCall { api.forceStopSession(id) }

    suspend fun getAcademicSessions() = safeCall { api.getAcademicSessions() }

    suspend fun createAcademicSession(req: CreateAcademicSessionRequest) =
        safeCall { api.createAcademicSession(req) }

    suspend fun activateAcademicSession(id: String) =
        safeCall { api.activateAcademicSession(id) }

    suspend fun promoteStudents(req: PromoteRequest) = safeCall { api.promoteStudents(req) }

    suspend fun sendAlert(studentId: String, percentage: Double) =
        safeCall { api.sendAlert(AlertRequest(studentId, attendancePct = percentage)) }

    private suspend fun <T> safeCall(call: suspend () -> retrofit2.Response<T>): Resource<T> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body != null) Resource.Success(body)
            else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Resource.Error(error)
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
}
