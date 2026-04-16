package com.smartattend.ui.student

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.StudentRepository
import com.smartattend.domain.model.AttendanceListResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StudentHistoryViewModel @Inject constructor(
    private val repo: StudentRepository
) : ViewModel() {

    private val _history = MutableStateFlow<Resource<AttendanceListResponse>>(Resource.Loading)
    val history = _history.asStateFlow()

    private val _subjects = MutableStateFlow<Resource<SubjectsResponse>>(Resource.Loading)
    val subjects = _subjects.asStateFlow()

    var selectedSubjectId: String? = null

    init {
        loadSubjects()
        loadHistory()
    }

    fun loadSubjects() {
        viewModelScope.launch { _subjects.emit(repo.getSubjects()) }
    }

    fun loadHistory(subjectId: String? = null) {
        viewModelScope.launch {
            _history.emit(Resource.Loading)
            _history.emit(repo.getAttendance(subjectId))
        }
    }

    fun filterBySubject(subjectId: String?) {
        selectedSubjectId = subjectId
        loadHistory(subjectId)
    }
}
