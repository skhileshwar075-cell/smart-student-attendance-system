package com.smartattend.ui.student

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentStudentRequestsBinding
import com.smartattend.domain.model.Subject
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.util.Calendar

@AndroidEntryPoint
class StudentRequestsFragment : Fragment() {

    private var _binding: FragmentStudentRequestsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: StudentRequestsViewModel by viewModels()
    private lateinit var requestsAdapter: StudentRequestsAdapter
    private var subjects: List<Subject> = emptyList()
    private var selectedDate = ""

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentStudentRequestsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requestsAdapter = StudentRequestsAdapter()
        binding.rvRequests.layoutManager = LinearLayoutManager(requireContext())
        binding.rvRequests.adapter = requestsAdapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadRequests() }
        binding.btnPickDate.setOnClickListener { showDatePicker() }
        binding.btnSubmitRequest.setOnClickListener { submitRequest() }
        binding.btnToggleForm.setOnClickListener { toggleForm() }

        setupObservers()
    }

    private fun toggleForm() {
        val isVisible = binding.formLayout.visibility == View.VISIBLE
        binding.formLayout.visibility = if (isVisible) View.GONE else View.VISIBLE
        binding.btnToggleForm.text = if (isVisible) "+ New Request" else "Cancel"
    }

    private fun showDatePicker() {
        val cal = Calendar.getInstance()
        DatePickerDialog(requireContext(), { _, y, m, d ->
            selectedDate = "$y-${String.format("%02d", m+1)}-${String.format("%02d", d)}"
            binding.btnPickDate.text = selectedDate
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun submitRequest() {
        val subjectIndex = binding.spinnerSubject.selectedItemPosition
        val subject = subjects.getOrNull(subjectIndex)
        val reason = binding.etReason.text.toString().trim()

        if (subject == null) { Toast.makeText(requireContext(), "Select a subject", Toast.LENGTH_SHORT).show(); return }
        if (selectedDate.isBlank()) { Toast.makeText(requireContext(), "Select a date", Toast.LENGTH_SHORT).show(); return }
        if (reason.isBlank()) { Toast.makeText(requireContext(), "Enter reason", Toast.LENGTH_SHORT).show(); return }

        viewModel.submitRequest(subject.id, selectedDate, reason)
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.subjects.collect { state ->
                if (state is Resource.Success) {
                    subjects = state.data.subjects
                    val names = subjects.map { it.name }
                    val spinnerAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, names)
                    spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    binding.spinnerSubject.adapter = spinnerAdapter
                }
            }
        }

        lifecycleScope.launch {
            viewModel.requests.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.requests
                        requestsAdapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.tvEmpty.visibility = View.VISIBLE
                        binding.tvEmpty.text = state.message
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.submitState.collect { state ->
                when (state) {
                    is Resource.Loading -> binding.btnSubmitRequest.isEnabled = false
                    is Resource.Success -> {
                        binding.btnSubmitRequest.isEnabled = true
                        Toast.makeText(requireContext(), "Request submitted!", Toast.LENGTH_SHORT).show()
                        binding.etReason.text?.clear()
                        binding.formLayout.visibility = View.GONE
                        binding.btnToggleForm.text = "+ New Request"
                        viewModel.clearSubmitState()
                    }
                    is Resource.Error -> {
                        binding.btnSubmitRequest.isEnabled = true
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearSubmitState()
                    }
                    null -> binding.btnSubmitRequest.isEnabled = true
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
