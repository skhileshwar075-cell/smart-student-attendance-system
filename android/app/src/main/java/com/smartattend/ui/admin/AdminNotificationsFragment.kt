package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentAdminNotificationsBinding
import com.smartattend.ui.student.NotificationsAdapter
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminNotificationsFragment : Fragment() {

    private var _binding: FragmentAdminNotificationsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminNotificationsViewModel by viewModels()
    private lateinit var adapter: NotificationsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = NotificationsAdapter { notification -> viewModel.markRead(notification.id) }
        binding.rvNotifications.layoutManager = LinearLayoutManager(requireContext())
        binding.rvNotifications.adapter = adapter

        binding.btnMarkAllRead.setOnClickListener { viewModel.markAllRead() }
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }

        setupObservers()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.notifications.collectLatest { state ->
                        when (state) {
                            is Resource.Loading -> {
                                binding.swipeRefresh.isRefreshing = true
                                binding.rvNotifications.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                            is Resource.Success -> {
                                binding.swipeRefresh.isRefreshing = false
                                val notifications = state.data.notifications
                                adapter.submitList(notifications)
                                binding.tvUnreadCount.text = "${notifications.count { !it.isRead }} unread"
                                
                                if (notifications.isEmpty()) {
                                    binding.rvNotifications.visibility = View.GONE
                                    binding.layoutEmpty.root.visibility = View.VISIBLE
                                    binding.layoutEmpty.tvEmptyTitle.text = "No notifications"
                                    binding.layoutEmpty.tvEmptyMessage.text = "You don't have any notifications at the moment"
                                } else {
                                    binding.rvNotifications.visibility = View.VISIBLE
                                    binding.layoutEmpty.root.visibility = View.GONE
                                }
                            }
                            is Resource.Error -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.rvNotifications.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "Error"
                                binding.layoutEmpty.tvEmptyMessage.text = state.message
                                binding.tvUnreadCount.text = ""
                            }
                        }
                    }
                }

                launch {
                    viewModel.actionState.collectLatest { state ->
                        if (state is Resource.Success) {
                            viewModel.load()
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
