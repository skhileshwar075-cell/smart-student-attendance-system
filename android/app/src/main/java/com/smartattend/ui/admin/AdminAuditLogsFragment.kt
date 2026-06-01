package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentAdminAuditLogsBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminAuditLogsFragment : Fragment() {

    private var _binding: FragmentAdminAuditLogsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminAuditLogsViewModel by viewModels()
    private lateinit var adapter: AdminAuditLogsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminAuditLogsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = AdminAuditLogsAdapter()
        binding.rvLogs.layoutManager = LinearLayoutManager(requireContext())
        binding.rvLogs.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadLogs() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.loadLogs() }

        setupObservers()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.logs.collect { state ->
                    when (state) {
                        is Resource.Loading -> {
                            binding.swipeRefresh.isRefreshing = true
                            binding.layoutEmpty.root.visibility = View.GONE
                        }
                        is Resource.Success -> {
                            binding.swipeRefresh.isRefreshing = false
                            val list = state.data.logs
                            adapter.submitList(list)
                            binding.layoutEmpty.root.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                            if (list.isEmpty()) {
                                binding.layoutEmpty.tvEmptyTitle.text = "No Audit Logs"
                                binding.layoutEmpty.tvEmptyMessage.text = "All system activities will be logged here."
                                binding.layoutEmpty.btnRetry.visibility = View.GONE
                            }
                            binding.tvCount.text = "${list.size} log entries"
                        }
                        is Resource.Error -> {
                            binding.swipeRefresh.isRefreshing = false
                            binding.layoutEmpty.root.visibility = View.VISIBLE
                            binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Logs"
                            binding.layoutEmpty.tvEmptyMessage.text = state.message
                            binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                        }
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
