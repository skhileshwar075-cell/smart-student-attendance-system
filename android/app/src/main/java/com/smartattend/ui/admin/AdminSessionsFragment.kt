package com.smartattend.ui.admin

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminSessionsBinding
import com.smartattend.domain.model.AcademicSession
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminSessionsFragment : Fragment() {

    private var _binding: FragmentAdminSessionsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminSessionsViewModel by viewModels()
    private val adapter = SessionsAdapter(
        onActivate = { session -> confirmActivate(session) },
        onCreate = { showCreateDialog() }
    )

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAdminSessionsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.btnAddSession.setOnClickListener { showCreateDialog() }
        binding.btnPromote.setOnClickListener { showPromoteDialog() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }

        observeState()
    }

    private fun observeState() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.sessions.collect { state ->
                    binding.swipeRefresh.isRefreshing = state is Resource.Loading
                    when (state) {
                        is Resource.Success -> {
                            binding.layoutEmpty.root.visibility = if (state.data.isEmpty()) View.VISIBLE else View.GONE
                            if (state.data.isEmpty()) {
                                binding.layoutEmpty.tvEmptyTitle.text = "No Sessions Found"
                                binding.layoutEmpty.tvEmptyMessage.text = "Tap '+ New' to create an academic session."
                                binding.layoutEmpty.btnRetry.visibility = View.GONE
                            }
                            adapter.submitList(state.data)
                            val active = state.data.firstOrNull { it.isActive }
                            if (active != null) {
                                binding.tvActiveSession.visibility = View.VISIBLE
                                binding.tvActiveSession.text = "Active: ${active.name}"
                            } else {
                                binding.tvActiveSession.visibility = View.GONE
                            }
                        }
                        is Resource.Error -> {
                            binding.layoutEmpty.root.visibility = View.VISIBLE
                            binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Sessions"
                            binding.layoutEmpty.tvEmptyMessage.text = state.message
                            binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                        }
                        else -> {}
                    }
                }
            }
        }
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.actionResult.collect { result ->
                    when (result) {
                        is Resource.Success -> {
                            Toast.makeText(requireContext(), result.data, Toast.LENGTH_LONG).show()
                            viewModel.clearActionResult()
                        }
                        is Resource.Error -> {
                            Toast.makeText(requireContext(), result.message, Toast.LENGTH_LONG).show()
                            viewModel.clearActionResult()
                        }
                        else -> {}
                    }
                }
            }
        }
    }

    private fun showCreateDialog() {
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }
        val etName = EditText(requireContext()).apply { hint = "Session name (e.g. 2025-26)" }
        val etStart = EditText(requireContext()).apply { hint = "Start date (YYYY-MM-DD)" }
        val etEnd = EditText(requireContext()).apply { hint = "End date (YYYY-MM-DD)" }
        layout.addView(TextView(requireContext()).apply { text = "Session Name *" })
        layout.addView(etName)
        layout.addView(TextView(requireContext()).apply { text = "Start Date *"; setPadding(0, 16, 0, 0) })
        layout.addView(etStart)
        layout.addView(TextView(requireContext()).apply { text = "End Date *"; setPadding(0, 16, 0, 0) })
        layout.addView(etEnd)

        AlertDialog.Builder(requireContext())
            .setTitle("New Academic Session")
            .setView(layout)
            .setPositiveButton("Create") { _, _ ->
                val name = etName.text.toString().trim()
                val start = etStart.text.toString().trim()
                val end = etEnd.text.toString().trim()
                if (name.isEmpty() || start.isEmpty() || end.isEmpty()) {
                    Toast.makeText(requireContext(), "All fields are required", Toast.LENGTH_SHORT).show()
                } else {
                    viewModel.create(name, start, end, false)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmActivate(session: AcademicSession) {
        AlertDialog.Builder(requireContext())
            .setTitle("Activate Session")
            .setMessage("Set '${session.name}' as the active academic session? The current active session will be deactivated.")
            .setPositiveButton("Activate") { _, _ -> viewModel.activate(session.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showPromoteDialog() {
        val sessions = (viewModel.sessions.value as? Resource.Success)?.data ?: emptyList()
        val sessionNames = sessions.map { it.name }.toTypedArray()

        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }
        val etNewSession = EditText(requireContext()).apply {
            hint = "New session (e.g. 2025-26)"
            val active = sessions.firstOrNull { it.isActive }
            if (active != null) setText(active.name)
        }
        val semLabels = arrayOf("Max Sem 4", "Max Sem 6", "Max Sem 8", "Max Sem 10")
        val semValues = intArrayOf(4, 6, 8, 10)
        val semSpinner = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, semLabels)
            setSelection(2)
        }

        layout.addView(TextView(requireContext()).apply { text = "New Session Name *" })
        layout.addView(etNewSession)
        layout.addView(TextView(requireContext()).apply { text = "Max Semester Cap"; setPadding(0, 16, 0, 0) })
        layout.addView(semSpinner)
        layout.addView(TextView(requireContext()).apply {
            text = "All eligible students will have their semester incremented by 1."
            setPadding(0, 16, 0, 0)
            textSize = 12f
        })

        AlertDialog.Builder(requireContext())
            .setTitle("Bulk Student Promotion")
            .setView(layout)
            .setPositiveButton("Promote") { _, _ ->
                val newSession = etNewSession.text.toString().trim()
                if (newSession.isEmpty()) {
                    Toast.makeText(requireContext(), "Session name is required", Toast.LENGTH_SHORT).show()
                } else {
                    val maxSem = semValues[semSpinner.selectedItemPosition]
                    AlertDialog.Builder(requireContext())
                        .setTitle("Confirm Promotion")
                        .setMessage("Promote eligible students to session '$newSession'? This cannot be undone.")
                        .setPositiveButton("Yes, Promote") { _, _ ->
                            viewModel.promote(newSession, null, maxSem)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

// ── Adapter ────────────────────────────────────────────────────────────────────

class SessionsAdapter(
    private val onActivate: (AcademicSession) -> Unit,
    private val onCreate: () -> Unit
) : RecyclerView.Adapter<SessionsAdapter.VH>() {

    private var items = listOf<AcademicSession>()

    fun submitList(list: List<AcademicSession>) { items = list; notifyDataSetChanged() }

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvSessionName)
        val tvDates: TextView = view.findViewById(R.id.tvSessionDates)
        val tvActive: TextView = view.findViewById(R.id.tvSessionActive)
        val btnActivate: MaterialButton = view.findViewById(R.id.btnActivateSession)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_academic_session, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val s = items[position]
        holder.tvName.text = s.name
        holder.tvDates.text = "${s.startDate.take(10)}  →  ${s.endDate.take(10)}"
        if (s.isActive) {
            holder.tvActive.visibility = View.VISIBLE
            holder.btnActivate.visibility = View.GONE
        } else {
            holder.tvActive.visibility = View.GONE
            holder.btnActivate.visibility = View.VISIBLE
            holder.btnActivate.setOnClickListener { onActivate(s) }
        }
    }

    override fun getItemCount() = items.size
}
