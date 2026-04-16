package com.smartattend.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AuthRepository
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _sendState = MutableStateFlow<Resource<Unit>?>(null)
    val sendState: StateFlow<Resource<Unit>?> = _sendState

    private val _verifyState = MutableStateFlow<Resource<String>?>(null)
    val verifyState: StateFlow<Resource<String>?> = _verifyState

    private val _resetState = MutableStateFlow<Resource<Unit>?>(null)
    val resetState: StateFlow<Resource<Unit>?> = _resetState

    var pendingEmail = ""
    var resetToken = ""

    fun sendOtp(email: String) {
        pendingEmail = email
        viewModelScope.launch {
            _sendState.value = Resource.Loading
            try {
                val response = authRepository.forgotPassword(email)
                if (response.isSuccessful) {
                    _sendState.value = Resource.Success(Unit)
                } else {
                    val msg = response.errorBody()?.string()?.let {
                        try { org.json.JSONObject(it).optString("message", "Failed to send OTP") }
                        catch (_: Exception) { "Failed to send OTP" }
                    } ?: "Failed to send OTP"
                    _sendState.value = Resource.Error(msg)
                }
            } catch (e: Exception) {
                _sendState.value = Resource.Error(e.message ?: "Network error")
            }
        }
    }

    fun verifyOtp(otpCode: String) {
        viewModelScope.launch {
            _verifyState.value = Resource.Loading
            val result = authRepository.verifyOtp(pendingEmail, otpCode)
            when (result) {
                is Resource.Success -> {
                    resetToken = result.data.resetToken
                    _verifyState.value = Resource.Success(resetToken)
                }
                is Resource.Error -> _verifyState.value = Resource.Error(result.message)
                else -> {}
            }
        }
    }

    fun resetPassword(newPassword: String) {
        viewModelScope.launch {
            _resetState.value = Resource.Loading
            val result = authRepository.resetPassword(resetToken, newPassword)
            when (result) {
                is Resource.Success -> _resetState.value = Resource.Success(Unit)
                is Resource.Error -> _resetState.value = Resource.Error(result.message)
                else -> {}
            }
        }
    }
}
