package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AcademicSession
import com.smartattend.domain.model.CreateAcademicSessionRequest
import com.smartattend.domain.model.PromoteRequest
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminSessionsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _sessions = MutableStateFlow<Resource<List<AcademicSession>>>(Resource.Loading)
    val sessions: StateFlow<Resource<List<AcademicSession>>> = _sessions

    private val _actionResult = MutableStateFlow<Resource<String>?>(null)
    val actionResult: StateFlow<Resource<String>?> = _actionResult

    init { load() }

    fun load() {
        viewModelScope.launch {
            _sessions.value = Resource.Loading
            when (val r = repo.getAcademicSessions()) {
                is Resource.Success -> _sessions.value = Resource.Success(r.data.sessions)
                is Resource.Error   -> _sessions.value = Resource.Error(r.message)
                else -> {}
            }
        }
    }

    fun create(name: String, startDate: String, endDate: String, isActive: Boolean) {
        viewModelScope.launch {
            _actionResult.value = Resource.Loading
            val req = CreateAcademicSessionRequest(name, startDate, endDate, isActive)
            when (val r = repo.createAcademicSession(req)) {
                is Resource.Success -> { _actionResult.value = Resource.Success("Session created"); load() }
                is Resource.Error   -> _actionResult.value = Resource.Error(r.message)
                else -> {}
            }
        }
    }

    fun activate(id: String) {
        viewModelScope.launch {
            _actionResult.value = Resource.Loading
            when (val r = repo.activateAcademicSession(id)) {
                is Resource.Success -> { _actionResult.value = Resource.Success(r.data.message); load() }
                is Resource.Error   -> _actionResult.value = Resource.Error(r.message)
                else -> {}
            }
        }
    }

    fun promote(newSession: String, classId: String?, maxSemester: Int) {
        viewModelScope.launch {
            _actionResult.value = Resource.Loading
            val req = PromoteRequest(newSession, classId, maxSemester)
            when (val r = repo.promoteStudents(req)) {
                is Resource.Success -> {
                    _actionResult.value = Resource.Success(r.data.message)
                    load()
                }
                is Resource.Error   -> _actionResult.value = Resource.Error(r.message)
                else -> {}
            }
        }
    }

    fun clearActionResult() { _actionResult.value = null }
}
