package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.FragmentAdminDashboardBinding
import com.smartattend.domain.model.AdminStats
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminDashboardFragment : Fragment() {

    private var _binding: FragmentAdminDashboardBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminDashboardViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.stats.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.contentLayout.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.contentLayout.visibility = View.VISIBLE
                        binding.tvError.visibility = View.GONE
                        bindStats(state.data)
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.tvError.visibility = View.VISIBLE
                        binding.tvError.text = state.message
                    }
                }
            }
        }
    }

    private fun bindStats(stats: AdminStats) {
        binding.tvTotalStudents.text = "${stats.totalStudents}"
        binding.tvTotalTeachers.text = "${stats.totalTeachers}"
        binding.tvTotalClasses.text = "${stats.totalClasses}"
        binding.tvTotalSubjects.text = "${stats.totalSubjects}"
        binding.tvPresentToday.text = "${stats.presentToday}"
        binding.tvAbsentToday.text = "${stats.absentToday}"

        val total = stats.presentToday + stats.absentToday
        val pct = if (total > 0) (stats.presentToday * 100 / total) else 0
        binding.tvAttendanceRate.text = "$pct%"
        binding.progressAttendance.progress = pct
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
