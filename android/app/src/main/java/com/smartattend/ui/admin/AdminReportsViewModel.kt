package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AttendanceListResponse
import com.smartattend.domain.model.ClassesResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminReportsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _records = MutableStateFlow<Resource<AttendanceListResponse>>(Resource.Loading)
    val records = _records.asStateFlow()

    private val _classes = MutableStateFlow<Resource<ClassesResponse>>(Resource.Loading)
    val classes = _classes.asStateFlow()

    private val _subjects = MutableStateFlow<Resource<SubjectsResponse>>(Resource.Loading)
    val subjects = _subjects.asStateFlow()

    init {
        loadLookups()
    }

    fun loadLookups() {
        viewModelScope.launch {
            _classes.emit(Resource.Loading)
            _subjects.emit(Resource.Loading)
            _classes.emit(repo.getClasses())
            _subjects.emit(repo.getSubjects())
        }
    }

    fun load(
        from: String? = null,
        to: String? = null,
        classId: String? = null,
        subjectId: String? = null,
        studentId: String? = null,
        semester: Int? = null,
        session: String? = null
    ) {
        viewModelScope.launch {
            _records.emit(Resource.Loading)
            _records.emit(repo.getReports(from, to, classId, subjectId, studentId, semester, session))
        }
    }
}
