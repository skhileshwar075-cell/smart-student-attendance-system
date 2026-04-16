package com.smartattend.ui.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.local.PreferenceManager
import com.smartattend.data.repository.TeacherRepository
import com.smartattend.domain.model.TeacherDashboard
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherDashboardViewModel @Inject constructor(
    private val repo: TeacherRepository,
    private val prefs: PreferenceManager
) : ViewModel() {

    private val _dashboard = MutableStateFlow<Resource<TeacherDashboard>>(Resource.Loading)
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
