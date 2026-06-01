package com.smartattend.data.repository

import com.smartattend.data.api.ApiService
import com.smartattend.data.local.PreferenceManager
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val prefs: PreferenceManager
) {
    suspend fun login(email: String, password: String): Resource<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(email, password))
            val body = response.body()
            if (response.isSuccessful && body != null) {
                prefs.saveSession(body.token, body.user.id, body.user.name, body.user.email, body.user.role, body.user.profileId, body.user.classId)
                Resource.Success(body)
            } else {
                val error = response.errorBody()?.string() ?: "Login failed"
                Resource.Error(extractError(error))
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun getMe(): Resource<User> {
        return try {
            val response = api.getMe()
            val body = response.body()
            if (response.isSuccessful && body != null) Resource.Success(body)
            else Resource.Error("Failed to fetch user: ${response.message()}")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun isLoggedIn(): Boolean = prefs.authToken.first() != null

    suspend fun getUserRole(): String? = prefs.userRole.first()

    suspend fun getUserName(): String? = prefs.userName.first()

    suspend fun logout() = prefs.clearSession()

    suspend fun register(name: String, email: String, password: String, role: String): retrofit2.Response<MessageResponse> {
        return try {
            api.register(RegisterRequest(name, email, password, role))
        } catch (e: Exception) {
            retrofit2.Response.error(500, okhttp3.ResponseBody.create(null, "Network failure"))
        }
    }

    suspend fun forgotPassword(email: String): retrofit2.Response<MessageResponse> {
        return api.forgotPassword(ForgotPasswordRequest(email))
    }

    suspend fun verifyOtp(email: String, otpCode: String): Resource<VerifyOtpResponse> {
        return try {
            val response = api.verifyOtp(VerifyOtpRequest(email, otpCode))
            val body = response.body()
            if (response.isSuccessful && body != null) Resource.Success(body)
            else Resource.Error(extractError(response.errorBody()?.string() ?: "Invalid OTP"))
        } catch (e: Exception) { Resource.Error(e.message ?: "Network error") }
    }

    suspend fun resetPassword(resetToken: String, newPassword: String): Resource<String> {
        return try {
            val response = api.resetPassword(ResetPasswordRequest(resetToken, newPassword))
            if (response.isSuccessful) Resource.Success(response.body()?.message ?: "Password reset successful")
            else Resource.Error(extractError(response.errorBody()?.string() ?: "Reset failed"))
        } catch (e: Exception) { Resource.Error(e.message ?: "Network error") }
    }

    suspend fun updateProfile(name: String, phone: String): Resource<String> {
        return try {
            val response = api.updateProfile(UpdateProfileRequest(name, phone))
            if (response.isSuccessful) Resource.Success(response.body()?.message ?: "Profile updated")
            else Resource.Error(extractError(response.errorBody()?.string() ?: "Update failed"))
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Resource<String> {
        return try {
            val response = api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
            if (response.isSuccessful) Resource.Success(response.body()?.message ?: "Password changed")
            else Resource.Error(extractError(response.errorBody()?.string() ?: "Change password failed"))
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun uploadProfilePhoto(base64: String): Resource<String> {
        return try {
            val response = api.updateProfilePhoto(UpdateProfilePhotoRequest(base64))
            if (response.isSuccessful) Resource.Success(response.body()?.message ?: "Photo updated")
            else Resource.Error(extractError(response.errorBody()?.string() ?: "Upload failed"))
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun updateFcmToken(token: String) {
        try { api.updateFcmToken(FcmTokenRequest(token)) } catch (_: Exception) {}
    }

    private fun extractError(json: String): String {
        return try {
            val idx = json.indexOf("\"error\":\"")
            if (idx >= 0) json.substring(idx + 9).substringBefore("\"") else json
        } catch (e: Exception) { json }
    }
}