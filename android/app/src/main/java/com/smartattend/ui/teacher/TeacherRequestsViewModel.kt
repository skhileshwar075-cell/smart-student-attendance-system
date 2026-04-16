package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.MessageResponse
import com.smartattend.domain.model.RequestsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherRequestsViewModel @Inject constructor(
    private val repo: TeacherRepository
) : ViewModel() {

    private val _requests = MutableStateFlow<Resource<RequestsResponse>>(Resource.Loading)
    val requests = _requests.asStateFlow()

    private val _reviewState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val reviewState = _reviewState.asStateFlow()

    var currentFilter = "pending"

    init { loadRequests() }

    fun loadRequests(status: String? = "pending") {
        currentFilter = status ?: "pending"
        viewModelScope.launch {
            _requests.emit(Resource.Loading)
            _requests.emit(repo.getRequests(status))
        }
    }

    fun approve(id: String, note: String? = null) {
        viewModelScope.launch {
            _reviewState.emit(Resource.Loading)
            _reviewState.emit(repo.reviewRequest(id, "approved", note))
            loadRequests(currentFilter)
        }
    }

    fun reject(id: String, note: String? = null) {
        viewModelScope.launch {
            _reviewState.emit(Resource.Loading)
            _reviewState.emit(repo.reviewRequest(id, "rejected", note))
            loadRequests(currentFilter)
        }
    }

    fun clearReviewState() { viewModelScope.launch { _reviewState.emit(null) } }
}
