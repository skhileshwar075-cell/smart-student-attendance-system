package com.smartattend.data.repository

import com.smartattend.data.api.ApiService
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TeacherRepository @Inject constructor(private val api: ApiService) {

    suspend fun getDashboard() = safeCall { api.getTeacherDashboard() }

    suspend fun getSubjects() = safeCall { api.getTeacherSubjects() }

    suspend fun getStudents(search: String? = null, subjectId: String? = null, classId: String? = null) =
        safeCall { api.getTeacherStudents(search, subjectId, classId) }

    suspend fun createSession(subjectId: String, type: String, geoLat: Double?, geoLng: Double?, geoRadius: Int?) =
        safeCall { api.createSession(CreateSessionRequest(subjectId, type, geoLat, geoLng, geoRadius)) }

    suspend fun getSessions() = safeCall { api.getTeacherSessions() }

    suspend fun getActiveSessions() = safeCall { api.getTeacherActiveSessions() }

    suspend fun stopSession(id: String) = safeCall { api.stopSession(id) }

    suspend fun saveManualAttendance(subjectId: String, date: String?, records: List<AttendanceRecordInput>) =
        safeCall { api.saveManualAttendance(ManualAttendanceRequest(subjectId, date, records)) }

    suspend fun getAttendance(subjectId: String? = null, from: String? = null, to: String? = null, studentId: String? = null) =
        safeCall { api.getTeacherAttendance(subjectId, from, to, studentId) }

    suspend fun getReport(subjectId: String? = null, from: String? = null, to: String? = null) =
        safeCall { api.getAttendanceReport(subjectId, from, to) }

    suspend fun getPivotReport(subjectId: String? = null, from: String? = null, to: String? = null) =
        safeCall { api.getPivotReport(subjectId, from, to) }

    suspend fun getRequests(status: String? = null) = safeCall { api.getTeacherRequests(status) }

    suspend fun reviewRequest(id: String, status: String, note: String?) =
        safeCall { api.reviewRequest(id, ReviewRequestBody(status, note)) }

    suspend fun createStudent(name: String, email: String, phone: String?, rollNumber: String?) =
        safeCall { api.createTeacherStudent(TeacherCreateStudentRequest(name, email, phone, rollNumber)) }

    suspend fun updateStudent(id: String, name: String, email: String, phone: String?, rollNumber: String?) =
        safeCall { api.updateTeacherStudent(id, TeacherUpdateStudentRequest(name, email, phone, rollNumber)) }

    suspend fun deleteStudent(id: String) = safeCall { api.deleteTeacherStudent(id) }

    suspend fun getLowAttendance(threshold: Int? = null) = safeCall { api.getLowAttendanceStudents(threshold) }

    suspend fun getShortlist(
        subjectId: String? = null,
        from: String? = null,
        to: String? = null,
        threshold: Int? = null,
        search: String? = null
    ) = safeCall { api.getShortlist(subjectId, from, to, threshold, search) }

    suspend fun sendAlert(studentId: String, message: String?, subjectId: String?) =
        safeCall { api.sendAlert(AlertRequest(studentId, message, subjectId)) }

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
