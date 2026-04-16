package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.*
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherStudentsViewModel @Inject constructor(
    private val repo: TeacherRepository
) : ViewModel() {

    private val _students = MutableStateFlow<Resource<StudentsResponse>>(Resource.Loading)
    val students = _students.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<String>?>(null)
    val actionState = _actionState.asStateFlow()

    var searchQuery = ""

    init { loadStudents() }

    fun loadStudents(search: String? = null) {
        searchQuery = search ?: ""
        viewModelScope.launch {
            _students.emit(Resource.Loading)
            _students.emit(repo.getStudents(search))
        }
    }

    fun createStudent(name: String, email: String, phone: String?, rollNumber: String?) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.createStudent(name, email, phone, rollNumber)
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Student created successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun updateStudent(id: String, name: String, email: String, phone: String?, rollNumber: String?) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.updateStudent(id, name, email, phone, rollNumber)
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
                is Resource.Success -> Resource.Success("Student removed")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun clearActionState() { viewModelScope.launch { _actionState.emit(null) } }
}
