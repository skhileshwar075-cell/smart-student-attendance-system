package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AuditLogsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminAuditLogsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _logs = MutableStateFlow<Resource<AuditLogsResponse>>(Resource.Loading)
    val logs = _logs.asStateFlow()

    init { loadLogs() }

    fun loadLogs() {
        viewModelScope.launch {
            _logs.emit(Resource.Loading)
            _logs.emit(repo.getAuditLogs())
        }
    }
}
