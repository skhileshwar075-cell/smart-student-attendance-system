package com.smartattend.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AuthRepository
import com.smartattend.domain.model.User
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _user = MutableStateFlow<Resource<User>>(Resource.Loading)
    val user: StateFlow<Resource<User>> = _user

    private val _updateResult = MutableStateFlow<Resource<String>?>(null)
    val updateResult: StateFlow<Resource<String>?> = _updateResult

    private val _passwordResult = MutableStateFlow<Resource<String>?>(null)
    val passwordResult: StateFlow<Resource<String>?> = _passwordResult

    private val _photoResult = MutableStateFlow<Resource<String>?>(null)
    val photoResult: StateFlow<Resource<String>?> = _photoResult

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _user.value = Resource.Loading
            _user.value = authRepository.getMe()
        }
    }

    fun updateProfile(name: String, phone: String) {
        viewModelScope.launch {
            _updateResult.value = Resource.Loading
            _updateResult.value = authRepository.updateProfile(name, phone)
        }
    }

    fun changePassword(currentPassword: String, newPassword: String) {
        viewModelScope.launch {
            _passwordResult.value = Resource.Loading
            _passwordResult.value = authRepository.changePassword(currentPassword, newPassword)
        }
    }

    fun uploadProfilePhoto(base64: String) {
        viewModelScope.launch {
            _photoResult.value = Resource.Loading
            _photoResult.value = authRepository.uploadProfilePhoto(base64)
        }
    }

    fun clearUpdateResult() { _updateResult.value = null }
    fun clearPasswordResult() { _passwordResult.value = null }
    fun clearPhotoResult() { _photoResult.value = null }
}
