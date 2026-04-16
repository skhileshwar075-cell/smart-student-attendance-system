package com.smartattend.ui.student

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AdapterView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentStudentHistoryBinding
import com.smartattend.domain.model.Subject
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class StudentHistoryFragment : Fragment() {

    private var _binding: FragmentStudentHistoryBinding? = null
    private val binding get() = _binding!!
    private val viewModel: StudentHistoryViewModel by viewModels()
    private lateinit var adapter: AttendanceHistoryAdapter
    private var subjects: List<Subject> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentStudentHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AttendanceHistoryAdapter()
        binding.rvHistory.layoutManager = LinearLayoutManager(requireContext())
        binding.rvHistory.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadHistory(viewModel.selectedSubjectId)
        }

        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.subjects.collect { state ->
                if (state is Resource.Success) {
                    subjects = state.data.subjects
                    val names = mutableListOf("All Subjects") + subjects.map { it.name }
                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, names)
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    binding.spinnerSubject.adapter = adapter
                    binding.spinnerSubject.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                        override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                            val subjectId = if (position == 0) null else subjects.getOrNull(position - 1)?.id
                            viewModel.filterBySubject(subjectId)
                        }
                        override fun onNothingSelected(parent: AdapterView<*>?) {}
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.history.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val records = state.data.records
                        adapter.submitList(records)
                        binding.tvEmpty.visibility = if (records.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvRecordCount.text = "${records.size} records"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.tvEmpty.visibility = View.VISIBLE
                        binding.tvEmpty.text = state.message
                    }
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
