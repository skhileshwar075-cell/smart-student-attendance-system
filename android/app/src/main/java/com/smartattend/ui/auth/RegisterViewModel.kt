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
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _registerState = MutableStateFlow<Resource<Unit>?>(null)
    val registerState: StateFlow<Resource<Unit>?> = _registerState

    fun register(name: String, email: String, password: String, role: String) {
        viewModelScope.launch {
            _registerState.value = Resource.Loading
            try {
                val response = authRepository.register(name, email, password, role)
                if (response.isSuccessful) {
                    _registerState.value = Resource.Success(Unit)
                } else {
                    val msg = response.errorBody()?.string()?.let {
                        try { org.json.JSONObject(it).optString("message", "Registration failed") }
                        catch (e: Exception) { "Registration failed" }
                    } ?: "Registration failed"
                    _registerState.value = Resource.Error(msg)
                }
            } catch (e: Exception) {
                _registerState.value = Resource.Error(e.message ?: "Network error")
            }
        }
    }
}
