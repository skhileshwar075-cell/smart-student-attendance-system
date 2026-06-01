package com.smartattend.ui.teacher

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
import com.smartattend.databinding.FragmentTeacherDashboardBinding
import com.smartattend.domain.model.TeacherDashboard
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.flow.collectLatest
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
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }
        setupObservers()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.userName.collectLatest { name ->
                        binding.tvWelcome.text = "Welcome, ${name ?: "Teacher"}"
                    }
                }

                launch {
                    viewModel.dashboard.collectLatest { state ->
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
                            }
                        }
                    }
                }
            }
        }
    }

    private fun bindDashboard(data: TeacherDashboard) {
        val sdf = SimpleDateFormat("EEEE, d MMMM yyyy", Locale.getDefault())
        binding.tvHeaderDate.text = sdf.format(Date())

        binding.tvSubjectCount.text = "${data.subjects?.size ?: 0}"
        binding.tvPresentToday.text = "${data.todayStats?.present ?: 0}"
        binding.tvAbsentToday.text = "${data.todayStats?.absent ?: 0}"
        binding.tvTotalToday.text = "${data.todayStats?.total ?: 0}"
        binding.tvPendingRequests.text = "${data.pendingRequests ?: 0}"

        binding.subjectsLayout.removeAllViews()
        data.subjects?.take(6)?.forEach { subject ->
            val subView = layoutInflater.inflate(R.layout.item_subject_card, binding.subjectsLayout, false)
            subView.findViewById<TextView>(R.id.tvSubjectName).text = subject.name
            subView.findViewById<TextView>(R.id.tvSubjectCode).text = subject.code
            val pct = subject.percentage ?: 0.0
            subView.findViewById<TextView>(R.id.tvSubjectPercentage).text = "${String.format("%.1f", pct)}%"
            subView.findViewById<TextView>(R.id.tvSubjectClasses).text =
                "${subject.className ?: ""} ${subject.classSection ?: ""}".trim()
            binding.subjectsLayout.addView(subView)
        }

        if (data.subjects.isNullOrEmpty()) {
            binding.tvNoSubjects.visibility = View.VISIBLE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
