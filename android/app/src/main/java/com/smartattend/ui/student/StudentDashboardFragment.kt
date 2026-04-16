package com.smartattend.ui.student

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.smartattend.R
import com.smartattend.databinding.FragmentStudentDashboardBinding
import com.smartattend.domain.model.StudentDashboard
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class StudentDashboardFragment : Fragment() {

    private var _binding: FragmentStudentDashboardBinding? = null
    private val binding get() = _binding!!
    private val viewModel: StudentDashboardViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentStudentDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupObservers()
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.userName.collect { name ->
                binding.tvWelcome.text = "Welcome, ${name ?: "Student"}"
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

    private fun bindDashboard(data: StudentDashboard) {
        binding.tvError.visibility = View.GONE

        binding.tvOverallPercentage.text = "${data.overallPercentage}%"
        binding.tvTotalClasses.text = "${data.totalClasses}"
        binding.tvPresentCount.text = "${data.presentCount}"
        binding.tvAbsentCount.text = "${data.totalClasses - data.presentCount}"

        val pct = data.overallPercentage
        binding.tvAttendanceStatus.text = when {
            pct >= 75 -> "Good Standing"
            pct >= 60 -> "At Risk"
            else -> "Critical"
        }
        binding.tvAttendanceStatus.setTextColor(
            resources.getColor(when {
                pct >= 75 -> R.color.green_600
                pct >= 60 -> R.color.amber_500
                else -> R.color.red_500
            }, null)
        )

        binding.tvSubjectCount.text = "${data.subjects.size} subjects enrolled"

        binding.subjectsLayout.removeAllViews()
        data.subjects.take(5).forEach { subject ->
            val subjectView = layoutInflater.inflate(R.layout.item_subject_card, binding.subjectsLayout, false)
            subjectView.findViewById<TextView>(R.id.tvSubjectName).text = subject.name
            subjectView.findViewById<TextView>(R.id.tvSubjectCode).text = subject.code
            val subjectPct = subject.percentage ?: 0.0
            subjectView.findViewById<TextView>(R.id.tvSubjectPercentage).text =
                "${String.format("%.1f", subjectPct)}%"
            subjectView.findViewById<TextView>(R.id.tvSubjectClasses).text =
                "${subject.presentCount ?: 0}/${subject.totalClasses ?: 0} classes"
            binding.subjectsLayout.addView(subjectView)
        }

        binding.recentLayout.removeAllViews()
        data.recentAttendance.take(5).forEach { record ->
            val recordView = layoutInflater.inflate(R.layout.item_recent_record, binding.recentLayout, false)
            recordView.findViewById<TextView>(R.id.tvRecordDate).text = record.date
            recordView.findViewById<TextView>(R.id.tvRecordSubject).text = record.subjectName ?: "—"
            val statusTv = recordView.findViewById<TextView>(R.id.tvRecordStatus)
            statusTv.text = record.status.replaceFirstChar { it.uppercase() }
            binding.recentLayout.addView(recordView)
        }

        if (data.recentAttendance.isEmpty()) {
            binding.tvNoRecent.visibility = View.VISIBLE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
