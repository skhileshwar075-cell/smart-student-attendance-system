package com.smartattend.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AuthRepository
import com.smartattend.domain.model.LoginResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _loginState = MutableStateFlow<Resource<LoginResponse>>(Resource.Error(""))
    val loginState = _loginState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.emit(Resource.Loading)
            _loginState.emit(authRepository.login(email, password))
        }
    }
}
