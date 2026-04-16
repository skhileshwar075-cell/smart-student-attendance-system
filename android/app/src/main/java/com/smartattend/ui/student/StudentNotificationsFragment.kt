package com.smartattend.ui.student

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentStudentNotificationsBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class StudentNotificationsFragment : Fragment() {

    private var _binding: FragmentStudentNotificationsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: StudentNotificationsViewModel by viewModels()
    private lateinit var adapter: NotificationsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentStudentNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = NotificationsAdapter(onMarkRead = { notification ->
            viewModel.markRead(notification.id)
        })
        binding.rvNotifications.layoutManager = LinearLayoutManager(requireContext())
        binding.rvNotifications.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.btnMarkAllRead.setOnClickListener { viewModel.markAllRead() }

        setupObservers()
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.notifications.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.notifications
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        val unread = list.count { !it.isRead }
                        binding.tvUnreadCount.text = if (unread > 0) "$unread unread" else "All read"
                        binding.btnMarkAllRead.isEnabled = unread > 0
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_SHORT).show()
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
