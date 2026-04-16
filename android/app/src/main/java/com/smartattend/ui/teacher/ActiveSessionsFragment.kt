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
import com.smartattend.databinding.FragmentActiveSessionsBinding
import com.smartattend.domain.model.AttendanceSession
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class ActiveSessionsFragment : Fragment() {

    private var _binding: FragmentActiveSessionsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ActiveSessionsViewModel by viewModels()
    private lateinit var adapter: ActiveSessionsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentActiveSessionsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupListeners()
        setupObservers()
    }

    private fun setupRecyclerView() {
        adapter = ActiveSessionsAdapter(
            onStopClick    = { session -> confirmStopSession(session) },
            onSessionExpired = { session -> viewModel.onSessionExpiredLocally(session) }
        )
        binding.rvActiveSessions.layoutManager = LinearLayoutManager(requireContext())
        binding.rvActiveSessions.adapter = adapter
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener { viewModel.manualRefresh() }

        binding.toggleFilter.setOnClickListener {
            viewModel.toggleFilter()
        }
    }

    private fun confirmStopSession(session: AttendanceSession) {
        AlertDialog.Builder(requireContext())
            .setTitle("Stop Session?")
            .setMessage(
                "Stop the '${session.sessionType.replaceFirstChar { it.uppercase() }}' session " +
                "for '${session.subjectName ?: "this subject"}'?\n\n" +
                "Students will immediately lose the ability to mark attendance."
            )
            .setPositiveButton("Stop Session") { _, _ -> viewModel.stopSession(session.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.showActiveOnly.collect { activeOnly ->
                binding.toggleFilter.text =
                    if (activeOnly) "Show All Today" else "Show Active Only"
            }
        }

        lifecycleScope.launch {
            viewModel.isLoading.collect { loading ->
                binding.swipeRefresh.isRefreshing = loading
                binding.progressBar.visibility =
                    if (loading && adapter.itemCount == 0) View.VISIBLE else View.GONE
            }
        }

        lifecycleScope.launch {
            viewModel.sessions.collect { sessions ->
                adapter.submitList(sessions)
                updateEmptyState(sessions)
            }
        }

        lifecycleScope.launch {
            viewModel.stopState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        Toast.makeText(requireContext(), "Session stopped", Toast.LENGTH_SHORT).show()
                        viewModel.clearStopState()
                    }
                    is Resource.Error -> {
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearStopState()
                    }
                    else -> {}
                }
            }
        }

        lifecycleScope.launch {
            viewModel.errorMessage.collect { msg ->
                if (!msg.isNullOrBlank()) {
                    Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
                    viewModel.clearError()
                }
            }
        }
    }

    private fun updateEmptyState(sessions: List<AttendanceSession>) {
        val loading = viewModel.isLoading.value
        if (sessions.isEmpty() && !loading) {
            binding.tvEmpty.visibility = View.VISIBLE
            binding.tvEmpty.text = if (viewModel.showActiveOnly.value)
                "No active sessions right now.\nCreate a session from Take Attendance."
            else
                "No sessions created today yet."
            binding.rvActiveSessions.visibility = View.GONE
        } else {
            binding.tvEmpty.visibility = View.GONE
            binding.rvActiveSessions.visibility =
                if (sessions.isEmpty()) View.GONE else View.VISIBLE
        }
    }

    override fun onDestroyView() {
        adapter.cancelAllTimers()
        super.onDestroyView()
        _binding = null
    }
}
