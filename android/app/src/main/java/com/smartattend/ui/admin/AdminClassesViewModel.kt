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
class AdminClassesViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _classes = MutableStateFlow<Resource<ClassesResponse>>(Resource.Loading)
    val classes = _classes.asStateFlow()

    private val _branches = MutableStateFlow<Resource<BranchesResponse>>(Resource.Loading)
    val branches = _branches.asStateFlow()

    private val _actionState = MutableStateFlow<Resource<String>?>(null)
    val actionState = _actionState.asStateFlow()

    init {
        loadClasses()
        loadBranches()
    }

    fun loadClasses() {
        viewModelScope.launch {
            _classes.emit(Resource.Loading)
            _classes.emit(repo.getClasses())
        }
    }

    fun loadBranches() {
        viewModelScope.launch { _branches.emit(repo.getBranches()) }
    }

    fun createClass(name: String, section: String?, branchId: String?, semester: Int, academicYear: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.createClass(CreateClassRequest(name, section, branchId, semester, academicYear))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Class created successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun updateClass(id: String, name: String, section: String?, branchId: String?, semester: Int, academicYear: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.updateClass(id, UpdateClassRequest(name, section, branchId, semester, academicYear))
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Class updated successfully")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun deleteClass(id: String) {
        viewModelScope.launch {
            _actionState.emit(Resource.Loading)
            val result = repo.deleteClass(id)
            _actionState.emit(when (result) {
                is Resource.Success -> Resource.Success("Class deleted")
                is Resource.Error -> Resource.Error(result.message)
                else -> Resource.Error("Unknown error")
            })
        }
    }

    fun clearActionState() { viewModelScope.launch { _actionState.emit(null) } }
}
