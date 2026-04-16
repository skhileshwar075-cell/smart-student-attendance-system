package com.smartattend.ui.student

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.StudentRepository
import com.smartattend.domain.model.MessageResponse
import com.smartattend.domain.model.RequestsResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StudentRequestsViewModel @Inject constructor(
    private val repo: StudentRepository
) : ViewModel() {

    private val _requests = MutableStateFlow<Resource<RequestsResponse>>(Resource.Loading)
    val requests = _requests.asStateFlow()

    private val _subjects = MutableStateFlow<Resource<SubjectsResponse>>(Resource.Loading)
    val subjects = _subjects.asStateFlow()

    private val _submitState = MutableStateFlow<Resource<MessageResponse>?>(null)
    val submitState = _submitState.asStateFlow()

    init {
        loadRequests()
        loadSubjects()
    }

    fun loadRequests() {
        viewModelScope.launch {
            _requests.emit(Resource.Loading)
            _requests.emit(repo.getRequests())
        }
    }

    fun loadSubjects() {
        viewModelScope.launch { _subjects.emit(repo.getSubjects()) }
    }

    fun submitRequest(subjectId: String, date: String, reason: String) {
        viewModelScope.launch {
            _submitState.emit(Resource.Loading)
            _submitState.emit(repo.submitRequest(subjectId, date, reason))
            loadRequests()
        }
    }

    fun clearSubmitState() {
        viewModelScope.launch { _submitState.emit(null) }
    }
}
