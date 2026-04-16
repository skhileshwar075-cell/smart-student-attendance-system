package com.smartattend.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartattend.data.repository.AdminRepository
import com.smartattend.domain.model.AnalyticsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminAnalyticsViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    private val _analytics = MutableStateFlow<Resource<AnalyticsResponse>>(Resource.Loading)
    val analytics = _analytics.asStateFlow()

    init { load() }

    fun load(from: String? = null, to: String? = null) {
        viewModelScope.launch {
            _analytics.emit(Resource.Loading)
            _analytics.emit(repo.getAnalytics(from, to))
        }
    }
}
