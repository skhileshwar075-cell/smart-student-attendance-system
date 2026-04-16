package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.AttendanceReportResponse
import com.smartattend.domain.model.ShortlistResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherReportsViewModel @Inject constructor(
    private val repo: TeacherRepository
) : ViewModel() {

    private val _subjects = MutableStateFlow<Resource<SubjectsResponse>>(Resource.Loading)
    val subjects = _subjects.asStateFlow()

    private val _report = MutableStateFlow<Resource<AttendanceReportResponse>?>(null)
    val report = _report.asStateFlow()

    private val _shortlist = MutableStateFlow<Resource<ShortlistResponse>?>(null)
    val shortlist = _shortlist.asStateFlow()

    init { loadSubjects() }

    fun loadSubjects() {
        viewModelScope.launch { _subjects.emit(repo.getSubjects()) }
    }

    fun loadReport(subjectId: String? = null, from: String? = null, to: String? = null) {
        viewModelScope.launch {
            _report.emit(Resource.Loading)
            _report.emit(repo.getReport(subjectId, from, to))
        }
    }

    fun loadShortlist(
        subjectId: String? = null,
        from: String? = null,
        to: String? = null,
        threshold: Int = 75,
        search: String? = null
    ) {
        viewModelScope.launch {
            _shortlist.emit(Resource.Loading)
            _shortlist.emit(repo.getShortlist(subjectId, from, to, threshold, search))
        }
    }

    suspend fun fetchPivotReport(subjectId: String? = null, from: String? = null, to: String? = null) =
        repo.getPivotReport(subjectId, from, to)

    suspend fun fetchShortlist(
        subjectId: String? = null,
        from: String? = null,
        to: String? = null,
        threshold: Int = 75,
        search: String? = null
    ) = repo.getShortlist(subjectId, from, to, threshold, search)
}
