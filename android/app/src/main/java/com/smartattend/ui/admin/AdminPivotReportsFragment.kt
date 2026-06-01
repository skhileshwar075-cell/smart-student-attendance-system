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
import com.smartattend.databinding.FragmentAdminPivotReportsBinding
import com.smartattend.domain.model.ClassesResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.domain.model.PivotReportResponse
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminPivotReportsFragment : Fragment() {

    private var _binding: FragmentAdminPivotReportsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminPivotReportsViewModel by viewModels()
    private lateinit var adapter: AdminPivotReportAdapter

    private val classIds = mutableListOf<String?>(null)
    private val subjectIds = mutableListOf<String?>(null)
    private var selectedClassId: String? = null
    private var selectedSubjectId: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminPivotReportsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminPivotReportAdapter()
        binding.rvPivotReport.layoutManager = LinearLayoutManager(requireContext())
        binding.rvPivotReport.adapter = adapter

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

        binding.btnLoadPivot.setOnClickListener { loadPivotReport() }
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }

        setupObservers()
        viewModel.loadLookups()
        viewModel.load()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.classes.collectLatest { state ->
                        if (state is Resource.Success) populateFilters(state.data)
                    }
                }

                launch {
                    viewModel.subjects.collectLatest { state ->
                        if (state is Resource.Success) populateSubjects(state.data)
                    }
                }

                launch {
                    viewModel.reports.collectLatest { state ->
                        when (state) {
                            is Resource.Loading -> {
                                binding.swipeRefresh.isRefreshing = true
                                binding.rvPivotReport.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                            is Resource.Success -> {
                                binding.swipeRefresh.isRefreshing = false
                                val rows = state.data.report
                                adapter.submitList(rows)
                                binding.tvRowCount.text = "${rows.size} students"
                                
                                if (rows.isEmpty()) {
                                    binding.rvPivotReport.visibility = View.GONE
                                    binding.layoutEmpty.root.visibility = View.VISIBLE
                                    binding.layoutEmpty.tvEmptyTitle.text = "No pivot data"
                                    binding.layoutEmpty.tvEmptyMessage.text = "No report data available for the selected criteria"
                                } else {
                                    binding.rvPivotReport.visibility = View.VISIBLE
                                    binding.layoutEmpty.root.visibility = View.GONE
                                }
                            }
                            is Resource.Error -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.rvPivotReport.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Report"
                                binding.layoutEmpty.tvEmptyMessage.text = state.message
                            }
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

    private fun loadPivotReport() {
        viewModel.load(
            from = binding.etFrom.text.toString().takeIf { it.isNotBlank() },
            to = binding.etTo.text.toString().takeIf { it.isNotBlank() },
            classId = selectedClassId,
            subjectId = selectedSubjectId
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
