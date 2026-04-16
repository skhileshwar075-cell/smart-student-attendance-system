package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminSubjectsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _subjects = MutableStateFlow<Resource<SubjectsResponse>>(Resource.Loading)
    val subjects = _subjects.asStateFlow()

    private val _classes = MutableStateFlow<Resource<ClassesResponse>>(Resource.Loading)
    val classes = _classes.asStateFlow()

    private val _teachers = MutableStateFlow<Resource<TeachersResponse>>(Resource.Loading)
    val teachers = _teachers.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<String>?>(null)
    val actionState = _actionState.asStateFlow()

    init {
        loadSubjects()
        loadClasses()
        loadTeachers()
    }

    fun loadSubjects(classId: String? = null, search: String? = null) {
        viewModelScope.launch {
            _subjects.emit(Resource.Loading)
            _subjects.emit(repo.getSubjects(classId, search))
        }
    }

    fun loadClasses() {
        viewModelScope.launch { _classes.emit(repo.getClasses()) }
    }

    fun loadTeachers() {
        viewModelScope.launch { _teachers.emit(repo.getTeachers()) }
    }

    fun createSubject(name: String, code: String, classId: String?, teacherId: String?) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.createSubject(CreateSubjectRequest(name, code, classId, teacherId))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Subject created successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun updateSubject(id: String, name: String, code: String, classId: String?, teacherId: String?) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.updateSubject(id, UpdateSubjectRequest(name, code, classId, teacherId))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Subject updated successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun deleteSubject(id: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.deleteSubject(id)
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Subject deleted")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun clearActionState() { viewModelScope.launch { _actionState.emit(null) } }
}
