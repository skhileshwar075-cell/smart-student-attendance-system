package com.smartattend.ui.student

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
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
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.userName.collect { name ->
                        binding.tvStudentName.text = name ?: "Student"
                    }
                }

                launch {
                    viewModel.dashboard.collect { state ->
                        when (state) {
                            is Resource.Loading -> {
                                binding.swipeRefresh.isRefreshing = true
                                binding.layoutShimmer.root.visibility = View.VISIBLE
                                binding.layoutShimmer.shimmerView.startShimmer()
                                binding.contentLayout.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                            is Resource.Success -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.layoutShimmer.shimmerView.stopShimmer()
                                binding.layoutShimmer.root.visibility = View.GONE
                                binding.contentLayout.visibility = View.VISIBLE
                                binding.layoutEmpty.root.visibility = View.GONE
                                bindDashboard(state.data)
                            }
                            is Resource.Error -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.layoutShimmer.shimmerView.stopShimmer()
                                binding.layoutShimmer.root.visibility = View.GONE
                                binding.contentLayout.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Dashboard"
                                binding.layoutEmpty.tvEmptyMessage.text = state.message
                                binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                                binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun bindDashboard(data: StudentDashboard) {
        val sdf = java.text.SimpleDateFormat("EEEE, d MMMM yyyy", java.util.Locale.getDefault())
        binding.tvHeaderDate.text = sdf.format(java.util.Date())

        binding.tvOverallPercentage.text = "${data.overallPercentage ?: 0}%"
        binding.tvTotalClasses.text = "${data.totalClasses ?: 0}"
        binding.tvPresentCount.text = "${data.presentCount ?: 0}"
        binding.tvAbsentCount.text = "${(data.totalClasses ?: 0) - (data.presentCount ?: 0)}"

        val pct = data.overallPercentage ?: 0
        binding.tvAttendanceStatus.text = when {
            pct >= 75 -> "Good Standing"
            pct >= 60 -> "At Risk"
            else -> "Critical"
        }
        binding.tvAttendanceStatus.setTextColor(
            androidx.core.content.ContextCompat.getColor(
                requireContext(),
                when {
                    pct >= 75 -> R.color.green_100
                    pct >= 60 -> R.color.amber_100
                    else -> R.color.red_100
                }
            )
        )

        binding.tvSubjectCount.text = "${data.subjects?.size ?: 0} subjects enrolled"

        binding.subjectsLayout.removeAllViews()
        data.subjects?.take(5)?.forEach { subject ->
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
        data.recentAttendance?.take(5)?.forEach { record ->
            val recordView = layoutInflater.inflate(R.layout.item_recent_record, binding.recentLayout, false)
            recordView.findViewById<TextView>(R.id.tvDate).text = record.date
            recordView.findViewById<TextView>(R.id.tvSubject).text = record.subjectName ?: "—"
            val statusTv = recordView.findViewById<TextView>(R.id.tvStatus)
            val status = record.status?.lowercase() ?: ""
            statusTv.text = status.replaceFirstChar { it.uppercase() }
            
            val dot = recordView.findViewById<View>(R.id.viewStatusDot)
            when (status) {
                "present" -> {
                    dot.setBackgroundResource(R.drawable.circle_green_solid)
                    statusTv.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.green_600))
                }
                "absent" -> {
                    dot.setBackgroundResource(R.drawable.circle_red_solid)
                    statusTv.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.red_600))
                }
                else -> {
                    dot.setBackgroundResource(R.drawable.circle_blue_solid)
                    statusTv.setTextColor(androidx.core.content.ContextCompat.getColor(requireContext(), R.color.blue_600))
                }
            }
            binding.recentLayout.addView(recordView)
        }

        if (data.recentAttendance.isNullOrEmpty()) {
            binding.tvNoRecent.visibility = View.VISIBLE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
