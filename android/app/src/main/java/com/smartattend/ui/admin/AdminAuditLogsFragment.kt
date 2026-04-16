package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
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

        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.logs.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.logs
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvCount.text = "${list.size} log entries"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
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
