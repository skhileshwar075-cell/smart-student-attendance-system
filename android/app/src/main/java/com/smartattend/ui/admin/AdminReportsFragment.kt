package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentAdminReportsBinding
import com.smartattend.domain.model.ClassesResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.domain.model.AttendanceListResponse
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminReportsFragment : Fragment() {

    private var _binding: FragmentAdminReportsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminReportsViewModel by viewModels()
    private lateinit var adapter: AdminAttendanceReportAdapter

    private val classIds = mutableListOf<String?>(null)
    private val subjectIds = mutableListOf<String?>(null)
    private var selectedClassId: String? = null
    private var selectedSubjectId: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminReportsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminAttendanceReportAdapter()
        binding.rvRecords.layoutManager = LinearLayoutManager(requireContext())
        binding.rvRecords.adapter = adapter

        val classAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, mutableListOf<String>())
        classAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerClass.adapter = classAdapter

        val subjectAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, mutableListOf<String>())
        subjectAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerSubject.adapter = subjectAdapter

        binding.spinnerClass.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedClassId = classIds.getOrNull(position)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.spinnerSubject.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedSubjectId = subjectIds.getOrNull(position)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.btnLoadReport.setOnClickListener { loadReport() }
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.layoutEmpty.btnRetry.setOnClickListener { loadReport() }

        setupObservers()
        viewModel.loadLookups()
        viewModel.load()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.classes.collect { state ->
                    if (state is Resource.Success) populateFilters(state.data)
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.subjects.collect { state ->
                    if (state is Resource.Success) populateSubjects(state.data)
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.records.collect { state ->
                    when (state) {
                        is Resource.Loading -> {
                            binding.swipeRefresh.isRefreshing = true
                            binding.rvRecords.visibility = View.GONE
                            binding.layoutEmpty.root.visibility = View.GONE
                        }
                        is Resource.Success -> {
                            binding.swipeRefresh.isRefreshing = false
                            binding.rvRecords.visibility = View.VISIBLE
                            val records = state.data.records
                            adapter.submitList(records)
                            binding.tvRowCount.text = "${records.size} records"
                            if (records.isEmpty()) {
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "No Records Found"
                                binding.layoutEmpty.tvEmptyMessage.text = "Try adjusting your filters."
                                binding.layoutEmpty.btnRetry.visibility = View.GONE
                            } else {
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                        }
                        is Resource.Error -> {
                            binding.swipeRefresh.isRefreshing = false
                            binding.rvRecords.visibility = View.GONE
                            binding.layoutEmpty.root.visibility = View.VISIBLE
                            binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Reports"
                            binding.layoutEmpty.tvEmptyMessage.text = state.message
                            binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                        }
                    }
                }
            }
        }
    }

    private fun populateFilters(data: ClassesResponse) {
        val items = mutableListOf("All classes")
        classIds.clear()
        classIds.add(null)
        data.classes.forEach {
            items.add("${it.name}${it.section?.let { section -> " - $section" } ?: ""}")
            classIds.add(it.id)
        }
        (binding.spinnerClass.adapter as? ArrayAdapter<String>)?.let {
            it.clear()
            it.addAll(items)
            it.notifyDataSetChanged()
        }
    }

    private fun populateSubjects(data: SubjectsResponse) {
        val items = mutableListOf("All subjects")
        subjectIds.clear()
        subjectIds.add(null)
        data.subjects.forEach {
            items.add(it.name)
            subjectIds.add(it.id)
        }
        (binding.spinnerSubject.adapter as? ArrayAdapter<String>)?.let {
            it.clear()
            it.addAll(items)
            it.notifyDataSetChanged()
        }
    }

    private fun loadReport() {
        viewModel.load(
            from = binding.etFrom.text.toString().takeIf { it.isNotBlank() },
            to = binding.etTo.text.toString().takeIf { it.isNotBlank() },
            classId = selectedClassId,
            subjectId = selectedSubjectId,
            studentId = binding.etStudentSearch.text.toString().takeIf { it.isNotBlank() }
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
