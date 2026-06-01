package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminDashboardBinding
import com.smartattend.domain.model.AdminStats
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }
        setupQuickActions()
        setupClickListeners()
        setupObservers()
    }

    private fun setupClickListeners() {
        binding.cardStudents.setOnClickListener {
            findNavController().navigate(R.id.adminStudentsFragment)
        }
        binding.cardTeachers.setOnClickListener {
            findNavController().navigate(R.id.adminTeachersFragment)
        }
        binding.cardSubjects.setOnClickListener {
            findNavController().navigate(R.id.adminSubjectsFragment)
        }
        binding.cardClasses.setOnClickListener {
            findNavController().navigate(R.id.adminClassesFragment)
        }
    }

    private fun setupQuickActions() {
        val items = listOf(
            AdminDashboardItem(1, "Analytics", "View system reports", R.drawable.ic_shield, R.color.violet_600, R.id.adminAnalyticsFragment),
            AdminDashboardItem(2, "Adv. Analytics", "Deep attendance insights", R.drawable.ic_face_detection, R.color.brand_primary, R.id.adminPivotReportsFragment),
            AdminDashboardItem(3, "Audit Logs", "System activity trail", R.drawable.ic_lock, R.color.gray_700, R.id.adminAuditLogsFragment),
            AdminDashboardItem(4, "Reports", "Export attendance data", R.drawable.ic_graduation_cap, R.color.green_600, R.id.adminReportsFragment),
            AdminDashboardItem(5, "Manage Students", "Add / Edit / Delete students", R.drawable.ic_student, R.color.orange_500, R.id.adminStudentsFragment),
            AdminDashboardItem(6, "Manage Teachers", "Add / Edit / Delete teachers", R.drawable.ic_teacher, R.color.blue_500, R.id.adminTeachersFragment),
            AdminDashboardItem(7, "Academic Sessions", "Manage semesters / sessions", R.drawable.ic_location, R.color.indigo_600, R.id.adminSessionsFragment),
            AdminDashboardItem(8, "Notifications", "Alerts & announcements", R.drawable.ic_notification, R.color.red_500, R.id.adminNotificationsFragment)
        )

        binding.rvQuickActions.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = AdminDashboardAdapter(items) { item ->
                findNavController().navigate(item.actionId)
            }
            isNestedScrollingEnabled = false
        }
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.stats.collect { state ->
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
                            bindStats(state.data)
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
                        }
                    }
                }
            }
        }
    }

    private fun bindStats(stats: AdminStats) {
        // Update Premium Hero Header Section
        val sdf = SimpleDateFormat("EEEE, d MMMM yyyy", Locale.getDefault())
        binding.tvHeaderDate.text = sdf.format(Date())
        
        val total = stats.totalStudents
        val present = stats.presentToday
        val absent = stats.absentToday
        
        // Calculate Rate: (Present / Enrolled) * 100
        val pct = if (total > 0) (present * 100 / total) else 0
        
        binding.tvHeaderAttendanceRate.text = "$pct%"
        binding.tvHeaderTotalEnrolled.text = "of $total enrolled"
        binding.tvHeaderPresent.text = "$present"
        binding.tvHeaderAbsent.text = "$absent"

        // Update Core Stats Grid
        binding.tvTotalStudents.text = "${stats.totalStudents}"
        binding.tvTotalTeachers.text = "${stats.totalTeachers}"
        binding.tvTotalSubjects.text = "${stats.totalSubjects}"
        binding.tvTotalClasses.text = "${stats.totalClasses}"

        // Update Today's Attendance Cards
        binding.tvPresentCount.text = "$present"
        binding.tvAbsentCount.text = "$absent"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
