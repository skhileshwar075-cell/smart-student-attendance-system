package com.smartattend.ui.teacher

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentTeacherRequestsBinding
import com.smartattend.domain.model.AttendanceRequest
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class TeacherRequestsFragment : Fragment() {

    private var _binding: FragmentTeacherRequestsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TeacherRequestsViewModel by viewModels()
    private lateinit var adapter: TeacherRequestsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTeacherRequestsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = TeacherRequestsAdapter(
            onApprove = { request -> showReviewDialog(request, "approved") },
            onReject = { request -> showReviewDialog(request, "rejected") }
        )
        binding.rvRequests.layoutManager = LinearLayoutManager(requireContext())
        binding.rvRequests.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadRequests(viewModel.currentFilter) }

        binding.chipPending.setOnClickListener { viewModel.loadRequests("pending") }
        binding.chipApproved.setOnClickListener { viewModel.loadRequests("approved") }
        binding.chipRejected.setOnClickListener { viewModel.loadRequests("rejected") }
        binding.chipAll.setOnClickListener { viewModel.loadRequests(null) }

        setupObservers()
    }

    private fun showReviewDialog(request: AttendanceRequest, action: String) {
        val noteInput = android.widget.EditText(requireContext())
        noteInput.hint = "Optional note for student"

        AlertDialog.Builder(requireContext())
            .setTitle(if (action == "approved") "Approve Request" else "Reject Request")
            .setMessage("${request.studentName}: ${request.subjectName} on ${request.date}")
            .setView(noteInput)
            .setPositiveButton(if (action == "approved") "Approve" else "Reject") { _, _ ->
                val note = noteInput.text.toString().trim().ifBlank { null }
                if (action == "approved") viewModel.approve(request.id, note)
                else viewModel.reject(request.id, note)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupObservers() {
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
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvRequestCount.text = "${list.size} requests"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.reviewState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        Toast.makeText(requireContext(), "Request updated", Toast.LENGTH_SHORT).show()
                        viewModel.clearReviewState()
                    }
                    is Resource.Error -> {
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearReviewState()
                    }
                    else -> {}
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
