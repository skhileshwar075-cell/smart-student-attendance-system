package com.smartattend.ui.teacher

import android.os.Bundle
import android.os.Environment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AdapterView
import android.widget.SeekBar
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.data.local.PreferenceManager
import com.smartattend.databinding.FragmentTeacherReportsBinding
import com.smartattend.domain.model.Subject
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class TeacherReportsFragment : Fragment() {

    private var _binding: FragmentTeacherReportsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TeacherReportsViewModel by viewModels()
    private lateinit var reportsAdapter: TeacherReportsAdapter
    private var subjects: List<Subject> = emptyList()
    private var selectedSubjectId: String? = null
    private var selectedSubject: Subject? = null
    private var shortlistThreshold: Int = 75

    @Inject lateinit var prefManager: PreferenceManager

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTeacherReportsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        reportsAdapter = TeacherReportsAdapter()
        binding.rvReport.layoutManager = LinearLayoutManager(requireContext())
        binding.rvReport.adapter = reportsAdapter

        binding.btnLoadReport.setOnClickListener {
            viewModel.loadReport(selectedSubjectId)
        }

        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadReport(selectedSubjectId)
        }

        binding.btnExportCsv.setOnClickListener {
            exportToCsv()
        }

        binding.btnExportSummary.setOnClickListener {
            exportSummaryCsv()
        }

        binding.seekThreshold.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                shortlistThreshold = progress + 1
                binding.tvThresholdLabel.text = "Below ${shortlistThreshold}%"
            }
            override fun onStartTrackingTouch(sb: SeekBar?) {}
            override fun onStopTrackingTouch(sb: SeekBar?) {}
        })

        binding.btnDownloadShortlist.setOnClickListener {
            downloadShortlist()
        }

        viewModel.loadSubjects()
        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.subjects.collect { state ->
                if (state is Resource.Success) {
                    subjects = state.data.subjects
                    val names = mutableListOf("All Subjects") + subjects.map { "${it.name} (${it.code})" }
                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, names)
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    binding.spinnerSubject.adapter = adapter
                    binding.spinnerSubject.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                        override fun onItemSelected(parent: AdapterView<*>?, view: View?, pos: Int, id: Long) {
                            selectedSubjectId = if (pos == 0) null else subjects.getOrNull(pos - 1)?.id
                            selectedSubject = if (pos == 0) null else subjects.getOrNull(pos - 1)
                        }
                        override fun onNothingSelected(parent: AdapterView<*>?) {}
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.report.collect { state ->
                when (state) {
                    null -> { binding.swipeRefresh.isRefreshing = false }
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val rows = state.data.report
                        reportsAdapter.submitList(rows)
                        binding.tvEmpty.visibility = if (rows.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvRowCount.text = "${rows.size} students"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun exportSummaryCsv() {
        val rows = reportsAdapter.currentList
        if (rows.isEmpty()) {
            Toast.makeText(requireContext(), "No data to export. Load a report first.", Toast.LENGTH_SHORT).show()
            return
        }
        lifecycleScope.launch {
            val userName = prefManager.userName.first() ?: "-"
            val now = Date()
            val monthYear = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(now)
            val today = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(now)
            val subjectName = selectedSubject?.name ?: "All Subjects"
            val branchName = selectedSubject?.branchName ?: selectedSubject?.className ?: "-"
            val semester = selectedSubject?.semester?.toString() ?: "-"

            val sb = StringBuilder()
            sb.appendLine("SUMMARY ATTENDANCE REPORT ($monthYear)")
            sb.appendLine()
            sb.appendLine("Subject  : $subjectName")
            sb.appendLine("Branch   : $branchName")
            sb.appendLine("Semester : $semester")
            sb.appendLine("Generated On : $today")
            sb.appendLine("Generated By : $userName")
            sb.appendLine()
            sb.appendLine("Student,Roll No,Total Classes,Present,Absent,Percentage")
            rows.forEach { r ->
                sb.appendLine("${r.name},${r.rollNumber ?: r.studentCode ?: ""},${r.totalClasses},${r.presentCount},${r.absentCount},${r.percentage}%")
            }

            try {
                val dir = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                val fileName = "summary_report_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(now)}.csv"
                val file = File(dir, fileName)
                file.writeText(sb.toString())
                Toast.makeText(requireContext(), "Saved: ${file.absolutePath}", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Export failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun exportToCsv() {
        lifecycleScope.launch {
            val userName = prefManager.userName.first() ?: "-"
            val now = Date()
            val monthYear = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(now)
            val today = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(now)
            val subjectName = selectedSubject?.name ?: "All Subjects"
            val branchName = selectedSubject?.branchName ?: selectedSubject?.className ?: "-"
            val semester = selectedSubject?.semester?.toString() ?: "-"

            val result = viewModel.fetchPivotReport(selectedSubjectId)
            if (result !is Resource.Success || result.data.report.isEmpty()) {
                Toast.makeText(requireContext(), "No data to export", Toast.LENGTH_SHORT).show()
                return@launch
            }
            val dates = result.data.dates
            val pivotRows = result.data.report

            val fmtDate: (String) -> String = { d ->
                val parts = d.split("-")
                if (parts.size == 3) "${parts[2]}-${parts[1]}-${parts[0]}" else d
            }

            val sb = StringBuilder()
            sb.appendLine("DAILY ATTENDANCE REPORT ($monthYear)")
            sb.appendLine()
            sb.appendLine("Subject  : $subjectName")
            sb.appendLine("Branch   : $branchName")
            sb.appendLine("Semester : $semester")
            sb.appendLine("Generated On : $today")
            sb.appendLine("Generated By : $userName")
            sb.appendLine()
            val dateHeaders = dates.joinToString(",") { fmtDate(it) }
            sb.appendLine("Student,Roll No,$dateHeaders,Total Classes,Present,Absent,Percentage")
            pivotRows.forEach { r ->
                val dateCols = r.dateValues.joinToString(",")
                sb.appendLine("${r.name},${r.rollNumber ?: r.studentCode ?: ""},$dateCols,${r.totalClasses},${r.presentCount},${r.absentCount},${r.percentage}%")
            }

            try {
                val dir = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                val fileName = "attendance_report_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(now)}.csv"
                val file = File(dir, fileName)
                file.writeText(sb.toString())
                Toast.makeText(requireContext(), "Saved: ${file.absolutePath}", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Export failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun downloadShortlist() {
        val from = binding.etShortlistFrom.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }
        val to = binding.etShortlistTo.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }

        lifecycleScope.launch {
            val userName = prefManager.userName.first() ?: "-"
            binding.btnDownloadShortlist.isEnabled = false
            binding.btnDownloadShortlist.text = "Fetching…"

            val result = viewModel.fetchShortlist(selectedSubjectId, from, to, shortlistThreshold)

            binding.btnDownloadShortlist.isEnabled = true
            binding.btnDownloadShortlist.text = "Download"

            when (result) {
                is Resource.Success -> {
                    val students = result.data.students
                    if (students.isEmpty()) {
                        Toast.makeText(requireContext(), "No students below ${shortlistThreshold}%", Toast.LENGTH_SHORT).show()
                    } else {
                        writeShortlistCsv(students, result.data.threshold, from, to, userName)
                    }
                }
                is Resource.Error -> Toast.makeText(requireContext(), "Failed: ${result.message}", Toast.LENGTH_LONG).show()
                else -> {}
            }
        }
    }

    private fun writeShortlistCsv(
        students: List<com.smartattend.domain.model.ShortlistStudentItem>,
        threshold: Double,
        from: String?,
        to: String?,
        userName: String
    ) {
        val now = Date()
        val monthYear = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(now)
        val today = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(now)
        val subjectName = selectedSubject?.name ?: "All Subjects"
        val branchName = selectedSubject?.branchName ?: selectedSubject?.className ?: "-"
        val semester = selectedSubject?.semester?.toString() ?: "-"
        val className = selectedSubject?.className ?: "-"
        val dateRange = "${from ?: "Beginning"} to ${to ?: today}"

        val sb = StringBuilder()
        sb.appendLine("SHORT ATTENDANCE LIST ($monthYear)")
        sb.appendLine()
        sb.appendLine("Branch    : $branchName")
        sb.appendLine("Semester  : $semester")
        sb.appendLine("Class     : $className")
        sb.appendLine("Subject   : $subjectName")
        sb.appendLine("Date Range: $dateRange")
        sb.appendLine("Threshold : Below ${threshold.toInt()}%")
        sb.appendLine("Generated On : $today")
        sb.appendLine("Generated By : $userName")
        sb.appendLine()
        sb.appendLine("Student Name,Roll No,Address,Mobile,Total Classes,Present,Absent,Percentage")
        students.forEach { s ->
            val rollNo = s.rollNumber ?: s.studentCode ?: ""
            sb.appendLine("\"${s.name}\",$rollNo,,${s.phone ?: ""},${s.totalClasses},${s.presentCount},${s.absentCount},${s.percentage}%")
        }

        try {
            val dir = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            val fileName = "low_attendance_shortlist_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(now)}.csv"
            val file = File(dir, fileName)
            file.writeText(sb.toString())
            Toast.makeText(requireContext(), "Shortlist saved: ${file.absolutePath}", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Export failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
