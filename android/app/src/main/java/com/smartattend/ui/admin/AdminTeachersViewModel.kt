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
class AdminTeachersViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _teachers = MutableStateFlow<Resource<TeachersResponse>>(Resource.Loading)
    val teachers = _teachers.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<String>?>(null)
    val actionState = _actionState.asStateFlow()

    var searchQuery = ""

    init { loadTeachers() }

    fun loadTeachers(search: String? = null) {
        searchQuery = search ?: ""
        viewModelScope.launch {
            _teachers.emit(Resource.Loading)
            _teachers.emit(repo.getTeachers(search))
        }
    }

    fun createTeacher(
        name: String, email: String, phone: String, teacherId: String,
        department: String, designation: String, password: String?
    ) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.createTeacher(CreateTeacherRequest(name, email, phone, teacherId, department, designation, password))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Teacher created successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun updateTeacher(
        id: String, name: String, email: String, phone: String,
        department: String, designation: String, isActive: Boolean
    ) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.updateTeacher(id, UpdateTeacherRequest(name, email, phone, department, designation, isActive))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Teacher updated successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun deleteTeacher(id: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.deleteTeacher(id)
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Teacher deleted")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun clearActionState() { viewModelScope.launch { _actionState.emit(null) } }
}
