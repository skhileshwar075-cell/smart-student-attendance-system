package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.MessageResponse
import com.smartattend.domain.model.NotificationsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminNotificationsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _notifications = MutableStateFlow<Resource<NotificationsResponse>>(Resource.Loading)
    val notifications = _notifications.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val actionState = _actionState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _notifications.emit(Resource.Loading)
            _notifications.emit(repo.getNotifications())
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            repo.markNotificationRead(id)
            load()
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            _actionState.emit(repo.markAllNotificationsRead())
            load()
        }
    }
}
