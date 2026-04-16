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
class AdminStudentsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _students = MutableStateFlow<Resource<StudentsResponse>>(Resource.Loading)
    val students = _students.asStateFlow()

    private val _classes = MutableStateFlow<Resource<ClassesResponse>>(Resource.Loading)
    val classes = _classes.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<String>?>(null)
    val actionState = _actionState.asStateFlow()

    var searchQuery = ""

    init {
        loadStudents()
        loadClasses()
    }

    fun loadStudents(search: String? = null) {
        searchQuery = search ?: ""
        viewModelScope.launch {
            _students.emit(Resource.Loading)
            _students.emit(repo.getStudents(search))
        }
    }

    fun loadClasses() {
        viewModelScope.launch { _classes.emit(repo.getClasses()) }
    }

    fun createStudent(
        name: String, email: String, phone: String, studentId: String,
        classId: String?, rollNumber: String, password: String?
    ) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.createStudent(CreateStudentRequest(name, email, phone, studentId, classId, rollNumber, password))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Student created successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun updateStudent(
        id: String, name: String, email: String, phone: String,
        classId: String?, rollNumber: String, isActive: Boolean
    ) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.updateStudent(id, UpdateStudentRequest(name, email, phone, classId, rollNumber, isActive))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Student updated successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun deleteStudent(id: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.deleteStudent(id)
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Student deleted")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun clearActionState() { viewModelScope.launch { _actionState.emit(null) } }
}
