package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AnalyticsResponse
import com.smartattend.domain.model.MessageResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminAnalyticsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _analytics = MutableStateFlow<Resource<AnalyticsResponse>>(Resource.Loading)
    val analytics = _analytics.asStateFlow()

    private val _alertState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val alertState = _alertState.asStateFlow()

    init { load() }

    fun load(from: String? = null, to: String? = null) {
        viewModelScope.launch {
            _analytics.emit(Resource.Loading)
            _analytics.emit(repo.getAnalytics(from, to))
        }
    }

    fun sendAlert(studentId: String, percentage: Double) {
        viewModelScope.launch {
            _alertState.emit(Resource.Loading)
            _alertState.emit(repo.sendAlert(studentId, percentage))
        }
    }

    fun resetAlertState() {
        _alertState.value = null
    }
}
