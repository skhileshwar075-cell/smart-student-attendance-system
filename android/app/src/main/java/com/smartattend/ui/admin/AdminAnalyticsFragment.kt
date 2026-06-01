package com.smartattend.ui.admin

import android.graphics.Color
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
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.github.mikephil.charting.formatter.PercentFormatter
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminAnalyticsBinding
import com.smartattend.domain.model.AnalyticsResponse
import com.smartattend.domain.model.MessageResponse
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@AndroidEntryPoint
class AdminAnalyticsFragment : Fragment() {

    private var _binding: FragmentAdminAnalyticsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminAnalyticsViewModel by viewModels()

    private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private var fromDate: String? = null
    private var toDate: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminAnalyticsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setOnRefreshListener { viewModel.load(fromDate, toDate) }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load(fromDate, toDate) }
        setupCharts()
        setupFilters()
        setupObservers()
    }

    private fun setupFilters() {
        binding.etFromDate.setOnClickListener { showDatePicker { date -> 
            fromDate = date
            binding.etFromDate.setText(date)
        }}
        binding.etToDate.setOnClickListener { showDatePicker { date -> 
            toDate = date
            binding.etToDate.setText(date)
        }}
        binding.btnUpdate.setOnClickListener {
            viewModel.load(fromDate, toDate)
        }
    }

    private fun showDatePicker(onDateSelected: (String) -> Unit) {
        val picker = MaterialDatePicker.Builder.datePicker()
            .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
            .build()
        picker.addOnPositiveButtonClickListener { selection ->
            onDateSelected(sdf.format(Date(selection)))
        }
        picker.show(childFragmentManager, "date_picker")
    }

    private fun setupCharts() {
        // Line Chart
        binding.lineChart.apply {
            description.isEnabled = false
            legend.isEnabled = true
            setTouchEnabled(true)
            setPinchZoom(true)
            xAxis.position = XAxis.XAxisPosition.BOTTOM
            xAxis.granularity = 1f
            axisRight.isEnabled = false
            setNoDataText("Loading attendance data...")
        }

        // Bar Chart
        binding.barChart.apply {
            description.isEnabled = false
            legend.isEnabled = false
            setTouchEnabled(true)
            setPinchZoom(false)
            setDrawGridBackground(false)
            setDrawBarShadow(false)
            setDrawValueAboveBar(true)
            
            xAxis.position = XAxis.XAxisPosition.BOTTOM
            xAxis.setDrawGridLines(false)
            xAxis.granularity = 1f
            
            axisLeft.axisMinimum = 0f
            axisLeft.axisMaximum = 100f
            // axisLeft.valueFormatter = PercentFormatter() // Removed causing potential issue with chart library
            
            axisRight.isEnabled = false
        }
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.analytics.collect { state ->
                        when (state) {
                            is Resource.Loading -> {
                                binding.swipeRefresh.isRefreshing = true
                                binding.contentLayout.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                            is Resource.Success -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.contentLayout.visibility = View.VISIBLE
                                binding.layoutEmpty.root.visibility = View.GONE
                                bindAnalytics(state.data)
                            }
                            is Resource.Error -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.contentLayout.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Analytics"
                                binding.layoutEmpty.tvEmptyMessage.text = state.message
                                binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                            }
                        }
                    }
                }

                launch {
                    viewModel.alertState.collect { state: Resource<MessageResponse>? ->
                        state?.let {
                            when (it) {
                                is Resource.Loading -> { /* Show progress if needed */ }
                                is Resource.Success -> {
                                    Snackbar.make(binding.root, "Alert sent successfully", Snackbar.LENGTH_SHORT).show()
                                    viewModel.resetAlertState()
                                }
                                is Resource.Error -> {
                                    Snackbar.make(binding.root, "Error: ${it.message}", Snackbar.LENGTH_LONG).show()
                                    viewModel.resetAlertState()
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun bindAnalytics(data: AnalyticsResponse?) {
        if (data == null) return
        binding.tvAnomalyCount.text = "${data.anomalyCount ?: 0} anomalies"

        // Update Trend Line Chart
        val trend = data.trend ?: emptyList()
        if (trend.isNotEmpty()) {
            try {
                val presentEntries = trend.mapIndexed { i, p -> Entry(i.toFloat(), p.present.toFloat()) }
                val absentEntries = trend.mapIndexed { i, p -> Entry(i.toFloat(), p.absent.toFloat()) }
                val labels = trend.map { it.date.takeLast(5) }

                val presentSet = LineDataSet(presentEntries, "Present").apply {
                    color = Color.parseColor("#16A34A")
                    setCircleColor(Color.parseColor("#16A34A"))
                    lineWidth = 2.5f
                    circleRadius = 4f
                    setDrawCircleHole(true)
                    valueTextSize = 0f
                    setDrawFilled(true)
                    fillColor = Color.parseColor("#16A34A")
                    fillAlpha = 20
                }
                val absentSet = LineDataSet(absentEntries, "Absent").apply {
                    color = Color.parseColor("#DC2626")
                    setCircleColor(Color.parseColor("#DC2626"))
                    lineWidth = 2.5f
                    circleRadius = 4f
                    setDrawCircleHole(true)
                    valueTextSize = 0f
                }
                binding.lineChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
                binding.lineChart.data = LineData(presentSet, absentSet)
                binding.lineChart.invalidate()
                binding.lineChart.visibility = View.VISIBLE
            } catch (e: Exception) {
                e.printStackTrace()
                binding.lineChart.visibility = View.GONE
            }
        } else {
            binding.lineChart.visibility = View.GONE
        }

        // Update Subject Bar Chart
        val subjectStats = data.subjectStats ?: emptyList()
        if (subjectStats.isNotEmpty()) {
            try {
                val barEntries = subjectStats.mapIndexed { i, s -> BarEntry(i.toFloat(), s.avgAttendance.toFloat()) }
                val labels = subjectStats.map { it.name }

                val barDataSet = BarDataSet(barEntries, "Avg Attendance %").apply {
                    colors = subjectStats.map { 
                        if (it.avgAttendance < 75) Color.parseColor("#EF4444") 
                        else Color.parseColor("#10B981") 
                    }
                    valueTextSize = 10f
                }
                
                binding.barChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
                binding.barChart.data = BarData(barDataSet).apply {
                    barWidth = 0.6f
                }
                binding.barChart.invalidate()
                binding.barChart.visibility = View.VISIBLE
            } catch (e: Exception) {
                e.printStackTrace()
                binding.barChart.visibility = View.GONE
            }
        } else {
            binding.barChart.visibility = View.GONE
        }

        // Update Low Attendance List
        binding.lowAttendanceLayout.removeAllViews()
        val lowAttendance = data.lowAttendance ?: emptyList()
        lowAttendance.forEach { student ->
            try {
                val rowView = layoutInflater.inflate(R.layout.item_low_attendance, binding.lowAttendanceLayout, false)
                rowView.findViewById<TextView>(R.id.tvStudentName).text = student.name
                rowView.findViewById<TextView>(R.id.tvClass).text = "${student.className ?: ""} ${student.section ?: ""}".trim()
                
                val pct = student.percentage
                val pctTv = rowView.findViewById<TextView>(R.id.tvPercentage)
                pctTv.text = "${String.format("%.1f", pct)}%"
                pctTv.setTextColor(Color.parseColor(if (pct < 75) "#DC2626" else "#D97706"))

                rowView.findViewById<View>(R.id.btnAlert).setOnClickListener {
                    student.id?.let { id ->
                        viewModel.sendAlert(id, pct)
                    } ?: Snackbar.make(binding.root, "Student ID missing", Snackbar.LENGTH_SHORT).show()
                }
                
                binding.lowAttendanceLayout.addView(rowView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        binding.tvNoLowAttendance.visibility = if (lowAttendance.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
