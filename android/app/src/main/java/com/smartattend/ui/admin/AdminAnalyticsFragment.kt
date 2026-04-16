package com.smartattend.ui.admin

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminAnalyticsBinding
import com.smartattend.domain.model.AnalyticsResponse
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminAnalyticsFragment : Fragment() {

    private var _binding: FragmentAdminAnalyticsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminAnalyticsViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminAnalyticsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        setupChart()
        setupObservers()
    }

    private fun setupChart() {
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
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.analytics.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.contentLayout.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.contentLayout.visibility = View.VISIBLE
                        binding.tvError.visibility = View.GONE
                        bindAnalytics(state.data)
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

    private fun bindAnalytics(data: AnalyticsResponse) {
        binding.tvAnomalyCount.text = "${data.anomalyCount} anomalies"

        if (data.trend.isNotEmpty()) {
            val presentEntries = data.trend.mapIndexed { i, p -> Entry(i.toFloat(), p.present.toFloat()) }
            val absentEntries = data.trend.mapIndexed { i, p -> Entry(i.toFloat(), p.absent.toFloat()) }
            val labels = data.trend.map { it.date.takeLast(5) }

            val presentSet = LineDataSet(presentEntries, "Present").apply {
                color = Color.parseColor("#16A34A")
                setCircleColor(Color.parseColor("#16A34A"))
                lineWidth = 2f
                valueTextSize = 0f
            }
            val absentSet = LineDataSet(absentEntries, "Absent").apply {
                color = Color.parseColor("#DC2626")
                setCircleColor(Color.parseColor("#DC2626"))
                lineWidth = 2f
                valueTextSize = 0f
            }
            binding.lineChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
            binding.lineChart.data = LineData(presentSet, absentSet)
            binding.lineChart.invalidate()
        }

        binding.lowAttendanceLayout.removeAllViews()
        data.lowAttendance.take(10).forEach { student ->
            val rowView = layoutInflater.inflate(R.layout.item_low_attendance, binding.lowAttendanceLayout, false)
            rowView.findViewById<TextView>(R.id.tvStudentName).text = student.name
            rowView.findViewById<TextView>(R.id.tvClass).text = "${student.className ?: ""} ${student.section ?: ""}".trim()
            val pct = student.percentage
            val pctTv = rowView.findViewById<TextView>(R.id.tvPercentage)
            pctTv.text = "${String.format("%.1f", pct)}%"
            pctTv.setTextColor(Color.parseColor(if (pct < 50) "#DC2626" else "#D97706"))
            binding.lowAttendanceLayout.addView(rowView)
        }

        if (data.lowAttendance.isEmpty()) {
            binding.tvNoLowAttendance.visibility = View.VISIBLE
        }

        binding.subjectStatsLayout.removeAllViews()
        data.subjectStats.forEach { stat ->
            val rowView = layoutInflater.inflate(R.layout.item_subject_stat, binding.subjectStatsLayout, false)
            rowView.findViewById<TextView>(R.id.tvSubjectName).text = stat.name
            rowView.findViewById<TextView>(R.id.tvSubjectCode).text = stat.code
            rowView.findViewById<TextView>(R.id.tvAvgAttendance).text =
                "${String.format("%.1f", stat.avgAttendance)}%"
            binding.subjectStatsLayout.addView(rowView)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
