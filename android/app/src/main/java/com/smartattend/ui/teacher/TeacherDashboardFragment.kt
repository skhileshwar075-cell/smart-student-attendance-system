package com.smartattend.ui.teacher

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.smartattend.R
import com.smartattend.databinding.FragmentTeacherDashboardBinding
import com.smartattend.domain.model.TeacherDashboard
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class TeacherDashboardFragment : Fragment() {

    private var _binding: FragmentTeacherDashboardBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TeacherDashboardViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTeacherDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.userName.collect { name ->
                binding.tvWelcome.text = "Welcome, ${name ?: "Teacher"}"
            }
        }

        lifecycleScope.launch {
            viewModel.dashboard.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.contentLayout.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.contentLayout.visibility = View.VISIBLE
                        binding.tvError.visibility = View.GONE
                        bindDashboard(state.data)
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

    private fun bindDashboard(data: TeacherDashboard) {
        binding.tvSubjectCount.text = "${data.subjects.size}"
        binding.tvPresentToday.text = "${data.todayStats.present}"
        binding.tvAbsentToday.text = "${data.todayStats.absent}"
        binding.tvTotalToday.text = "${data.todayStats.total}"
        binding.tvPendingRequests.text = "${data.pendingRequests}"

        binding.subjectsLayout.removeAllViews()
        data.subjects.take(6).forEach { subject ->
            val subView = layoutInflater.inflate(R.layout.item_subject_card, binding.subjectsLayout, false)
            subView.findViewById<TextView>(R.id.tvSubjectName).text = subject.name
            subView.findViewById<TextView>(R.id.tvSubjectCode).text = subject.code
            val pct = subject.percentage ?: 0.0
            subView.findViewById<TextView>(R.id.tvSubjectPercentage).text = "${String.format("%.1f", pct)}%"
            subView.findViewById<TextView>(R.id.tvSubjectClasses).text =
                "${subject.className ?: ""} ${subject.classSection ?: ""}".trim()
            binding.subjectsLayout.addView(subView)
        }

        if (data.subjects.isEmpty()) {
            binding.tvNoSubjects.visibility = View.VISIBLE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
