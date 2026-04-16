package com.smartattend.ui

import androidx.lifecycle.ViewModel
import com.smartattend.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    suspend fun isLoggedIn() = authRepository.isLoggedIn()
    suspend fun getUserRole() = authRepository.getUserRole()
    suspend fun getUserName() = authRepository.getUserName()
    suspend fun logout() = authRepository.logout()
}
