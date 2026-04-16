package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.AttendanceSession
import com.smartattend.domain.model.MessageResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

@HiltViewModel
class ActiveSessionsViewModel @Inject constructor(
    private val repository: TeacherRepository
) : ViewModel() {

    private val _sessions = MutableStateFlow<List<AttendanceSession>>(emptyList())
    val sessions = _sessions.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _stopState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val stopState = _stopState.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()

    // true = active only, false = all today
    private val _showActiveOnly = MutableStateFlow(true)
    val showActiveOnly = _showActiveOnly.asStateFlow()

    private var pollJob: Job? = null

    init {
        loadActiveSessions()
        startPolling()
    }

    // ── Polling every 30 s to synchronise with server-side expiries ───────────
    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(30_000L)
                refresh(silent = true)
            }
        }
    }

    private fun refresh(silent: Boolean = false) {
        if (_showActiveOnly.value) loadActiveSessions(silent)
        else loadAllTodaySessions(silent)
    }

    fun toggleFilter() {
        _showActiveOnly.value = !_showActiveOnly.value
        refresh()
    }

    fun manualRefresh() = refresh()

    fun loadActiveSessions(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) _isLoading.value = true
            _errorMessage.value = null
            when (val result = repository.getActiveSessions()) {
                is Resource.Success -> _sessions.value = result.data.sessions
                is Resource.Error -> if (!silent) _errorMessage.value = parseError(result.message)
                else -> {}
            }
            if (!silent) _isLoading.value = false
        }
    }

    fun loadAllTodaySessions(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) _isLoading.value = true
            _errorMessage.value = null
            when (val result = repository.getSessions()) {
                is Resource.Success -> _sessions.value = result.data.sessions
                is Resource.Error -> if (!silent) _errorMessage.value = parseError(result.message)
                else -> {}
            }
            if (!silent) _isLoading.value = false
        }
    }

    fun stopSession(sessionId: String) {
        viewModelScope.launch {
            _stopState.value = Resource.Loading
            val result = repository.stopSession(sessionId)
            _stopState.value = result
            if (result is Resource.Success) {
                // Optimistic remove — keeps UI instant
                _sessions.value = _sessions.value.filter { it.id != sessionId }
            }
        }
    }

    // Called from adapter when client-side timer expires
    fun onSessionExpiredLocally(session: AttendanceSession) {
        if (_showActiveOnly.value) {
            _sessions.value = _sessions.value.filter { it.id != session.id }
        }
        // In "all today" mode, leave it visible with expired status
    }

    fun clearStopState() { _stopState.value = null }
    fun clearError() { _errorMessage.value = null }

    private fun parseError(raw: String): String = try {
        JSONObject(raw).optString("error", raw)
    } catch (_: Exception) { raw }

    override fun onCleared() {
        super.onCleared()
        pollJob?.cancel()
    }
}
