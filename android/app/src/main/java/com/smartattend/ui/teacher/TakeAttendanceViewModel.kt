package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.*
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
class TakeAttendanceViewModel @Inject constructor(
    private val repository: TeacherRepository
) : ViewModel() {

    private val _subjects = MutableStateFlow<List<Subject>?>(null)
    val subjects = _subjects.asStateFlow()

    private val _students = MutableStateFlow<List<Student>?>(null)
    val students = _students.asStateFlow()

    private val _sessionState = MutableStateFlow<Resource<SessionResponse>>(Resource.Error(""))
    val sessionState = _sessionState.asStateFlow()

    private val _saveState = MutableStateFlow<Resource<MessageResponse>>(Resource.Error(""))
    val saveState = _saveState.asStateFlow()

    // ── Active sessions (inline in Take Attendance screen) ────────────────────
    private val _activeSessions = MutableStateFlow<List<AttendanceSession>>(emptyList())
    val activeSessions = _activeSessions.asStateFlow()

    private val _activeSessionsLoading = MutableStateFlow(false)
    val activeSessionsLoading = _activeSessionsLoading.asStateFlow()

    // Stop state for individual stop actions
    private val _stopState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val stopState = _stopState.asStateFlow()

    private var currentSessionId: String? = null
    private var pollJob: Job? = null

    // ── Polling every 30s to catch server-side expiries ──────────────────────
    fun startPolling() {
        if (pollJob?.isActive == true) return
        pollJob = viewModelScope.launch {
            while (isActive) {
                loadActiveSessions(silent = true)
                delay(30_000L)
            }
        }
    }

    fun stopPolling() {
        pollJob?.cancel()
        pollJob = null
    }

    fun loadSubjects() {
        viewModelScope.launch {
            val result = repository.getSubjects()
            if (result is Resource.Success) _subjects.value = result.data.subjects
        }
    }

    fun loadStudents(subjectId: String?) {
        viewModelScope.launch {
            val result = repository.getStudents(subjectId = subjectId)
            if (result is Resource.Success) _students.value = result.data.students
        }
    }

    fun loadActiveSessions(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) _activeSessionsLoading.value = true
            val result = repository.getActiveSessions()
            if (result is Resource.Success) {
                _activeSessions.value = result.data.sessions
            }
            if (!silent) _activeSessionsLoading.value = false
        }
    }

    // Called when client-side timer fires — removes the session locally
    // without waiting for the next poll
    fun onSessionExpiredLocally(session: AttendanceSession) {
        _activeSessions.value = _activeSessions.value.filter { it.id != session.id }
    }

    fun createSession(
        subjectId: String,
        type: String,
        geoLat: Double?,
        geoLng: Double?,
        geoRadius: Int?
    ) {
        viewModelScope.launch {
            _sessionState.emit(Resource.Loading)
            val result = repository.createSession(subjectId, type, geoLat, geoLng, geoRadius)
            if (result is Resource.Success) {
                currentSessionId = result.data.id
                loadActiveSessions()
            }
            _sessionState.emit(result)
        }
    }

    fun stopCurrentSession() {
        viewModelScope.launch {
            val id = currentSessionId ?: return@launch
            _stopState.value = Resource.Loading
            val result = repository.stopSession(id)
            currentSessionId = null
            _stopState.value = result
            if (result is Resource.Success) {
                _activeSessions.value = _activeSessions.value.filter { it.id != id }
                loadActiveSessions()
            }
        }
    }

    fun stopSession(sessionId: String) {
        viewModelScope.launch {
            _stopState.value = Resource.Loading
            val result = repository.stopSession(sessionId)
            _stopState.value = result
            if (result is Resource.Success) {
                _activeSessions.value = _activeSessions.value.filter { it.id != sessionId }
                if (sessionId == currentSessionId) currentSessionId = null
            }
        }
    }

    fun clearStopState() {
        _stopState.value = null
    }

    fun saveManualAttendance(
        subjectId: String,
        date: String?,
        records: List<AttendanceRecordInput>
    ) {
        viewModelScope.launch {
            _saveState.emit(Resource.Loading)
            _saveState.emit(repository.saveManualAttendance(subjectId, date, records))
        }
    }

    fun sendLowAttendanceAlerts(subjectId: String?) {
        viewModelScope.launch {
            val report = repository.getReport(subjectId = subjectId)
            if (report is Resource.Success) {
                val lowStudents = report.data.report.filter { it.percentage < 75 }
                lowStudents.forEach { row ->
                    repository.sendAlert(
                        row.studentId,
                        "Your attendance is ${row.percentage}%. Minimum required is 75%. Please attend classes regularly.",
                        subjectId
                    )
                }
            }
        }
    }

    fun parseErrorMessage(rawError: String): String {
        return try {
            JSONObject(rawError).optString("error", rawError)
        } catch (e: Exception) {
            rawError
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
