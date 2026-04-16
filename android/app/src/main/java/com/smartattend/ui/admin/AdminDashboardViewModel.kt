package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AdminStats
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminDashboardViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _stats = MutableStateFlow<Resource<AdminStats>>(Resource.Loading)
    val stats = _stats.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _stats.emit(Resource.Loading)
            _stats.emit(repo.getStats())
        }
    }
}
