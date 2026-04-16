package com.smartattend.ui.student

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.local.PreferenceManager
import com.smartattend.data.repository.StudentRepository
import com.smartattend.domain.model.StudentDashboard
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StudentDashboardViewModel @Inject constructor(
    private val repo: StudentRepository,
    private val prefs: PreferenceManager
) : ViewModel() {

    private val _dashboard = MutableStateFlow<Resource<StudentDashboard>>(Resource.Loading)
    val dashboard = _dashboard.asStateFlow()

    val userName = prefs.userName.stateIn(viewModelScope, SharingStarted.WhileSubscribed(), null)

    init { load() }

    fun load() {
        viewModelScope.launch {
            _dashboard.emit(Resource.Loading)
            _dashboard.emit(repo.getDashboard())
        }
    }
}
