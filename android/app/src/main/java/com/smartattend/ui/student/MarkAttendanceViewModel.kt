package com.smartattend.ui.student

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.StudentRepository
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MarkAttendanceViewModel @Inject constructor(
    private val repository: StudentRepository
) : ViewModel() {

    private val _sessions = MutableStateFlow<List<AttendanceSession>>(emptyList())
    val sessions = _sessions.asStateFlow()

    private val _markState = MutableStateFlow<Resource<MarkAttendanceResponse>>(Resource.Error(""))
    val markState = _markState.asStateFlow()

    private val _selectedSession = MutableStateFlow<AttendanceSession?>(null)
    val selectedSession = _selectedSession.asStateFlow()

    private var anomalyReason: String? = null

    fun loadActiveSessions() {
        viewModelScope.launch {
            val result = repository.getActiveSessions()
            if (result is Resource.Success) _sessions.value = result.data.sessions
        }
    }

    fun selectSession(session: AttendanceSession) {
        _selectedSession.value = session
    }

    fun flagAnomaly(reason: String) {
        anomalyReason = reason
    }

    fun markByCode(code: String, lat: Double?, lng: Double?, faceVerified: Boolean, attempts: Int = 0) {
        viewModelScope.launch {
            _markState.emit(Resource.Loading)
            val anomalyData = if (attempts > 3 || anomalyReason != null)
                AnomalyData(repeatedAttempts = attempts, locationMismatch = anomalyReason != null, confidence = 0.85)
            else null
            val request = MarkAttendanceRequest(sessionId = null, code = code, geoLat = lat, geoLng = lng, faceVerified = faceVerified, anomalyData = anomalyData)
            _markState.emit(repository.markAttendance(request))
        }
    }

    fun markBySession(sessionId: String, lat: Double?, lng: Double?, faceVerified: Boolean, attempts: Int = 0) {
        viewModelScope.launch {
            _markState.emit(Resource.Loading)
            val anomalyData = if (attempts > 3)
                AnomalyData(repeatedAttempts = attempts, locationMismatch = false, confidence = 0.7)
            else null
            val request = MarkAttendanceRequest(sessionId = sessionId, code = null, geoLat = lat, geoLng = lng, faceVerified = faceVerified, anomalyData = anomalyData)
            _markState.emit(repository.markAttendance(request))
        }
    }
}
