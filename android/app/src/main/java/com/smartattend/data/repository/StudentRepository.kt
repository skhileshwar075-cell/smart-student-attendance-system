package com.smartattend.data.repository

import com.smartattend.data.api.ApiService
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudentRepository @Inject constructor(private val api: ApiService) {

    suspend fun getDashboard(): Resource<StudentDashboard> = safeCall { api.getStudentDashboard() }

    suspend fun getAttendance(subjectId: String? = null, from: String? = null, to: String? = null) =
        safeCall { api.getStudentAttendance(subjectId, from, to) }

    suspend fun getSubjects() = safeCall { api.getStudentSubjects() }

    suspend fun getActiveSessions() = safeCall { api.getActiveSessions() }

    suspend fun markAttendance(request: MarkAttendanceRequest) =
        safeCall { api.markAttendance(request) }

    suspend fun getRequests() = safeCall { api.getAttendanceRequests() }

    suspend fun submitRequest(subjectId: String, date: String, reason: String) =
        safeCall { api.submitRequest(AttendanceRequestBody(subjectId, date, reason)) }

    suspend fun getNotifications() = safeCall { api.getNotifications() }

    suspend fun markNotificationRead(id: String) = safeCall { api.markNotificationRead(id) }

    suspend fun markAllRead() = safeCall { api.markAllNotificationsRead() }

    private suspend fun <T> safeCall(call: suspend () -> retrofit2.Response<T>): Resource<T> {
        return try {
            val response = call()
            if (response.isSuccessful && response.body() != null) Resource.Success(response.body()!!)
            else Resource.Error(response.errorBody()?.string() ?: "Error ${response.code()}")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
}
