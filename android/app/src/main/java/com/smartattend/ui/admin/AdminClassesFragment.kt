package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminClassesBinding
import com.smartattend.domain.model.Branch
import com.smartattend.domain.model.SchoolClass
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminClassesFragment : Fragment() {

    private var _binding: FragmentAdminClassesBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminClassesViewModel by viewModels()
    private lateinit var adapter: AdminClassesAdapter

    private var branches: List<Branch> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminClassesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminClassesAdapter(
            onEdit = { cls -> showEditDialog(cls) },
            onDelete = { cls -> confirmDelete(cls) }
        )
        binding.rvClasses.layoutManager = LinearLayoutManager(requireContext())
        binding.rvClasses.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadClasses() }
        binding.fabAddClass.setOnClickListener { showCreateDialog() }
        setupObservers()
    }

    // ── Dialogs ───────────────────────────────────────────────────────────────

    private fun showCreateDialog() = showClassDialog(null)

    private fun showEditDialog(cls: SchoolClass) = showClassDialog(cls)

    private fun showClassDialog(existing: SchoolClass?) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_admin_class_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etSection = dialogView.findViewById<TextInputEditText>(R.id.etSection)
        val etSemester = dialogView.findViewById<TextInputEditText>(R.id.etSemester)
        val etAcademicYear = dialogView.findViewById<TextInputEditText>(R.id.etAcademicYear)
        val spinnerBranch = dialogView.findViewById<Spinner>(R.id.spinnerBranch)

        val branchLabels = listOf("— No branch —") + branches.map { it.name }
        spinnerBranch.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, branchLabels)

        if (existing != null) {
            etName.setText(existing.name)
            etSection.setText(existing.section ?: "")
            etSemester.setText(existing.semester?.toString() ?: "")
            etAcademicYear.setText(existing.academicYear ?: "")
            val branchIdx = branches.indexOfFirst { it.id == existing.branchId }
            if (branchIdx >= 0) spinnerBranch.setSelection(branchIdx + 1)
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (existing == null) "Add Class" else "Edit Class")
            .setView(dialogView)
            .setPositiveButton(if (existing == null) "Create" else "Save") { _, _ ->
                val name = etName.text.toString().trim()
                val section = etSection.text.toString().trim()
                val semStr = etSemester.text.toString().trim()
                val year = etAcademicYear.text.toString().trim()
                val selectedIdx = spinnerBranch.selectedItemPosition
                val branchId = if (selectedIdx > 0) branches.getOrNull(selectedIdx - 1)?.id else null

                if (name.isBlank()) {
                    Toast.makeText(requireContext(), "Class name is required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val semester = semStr.toIntOrNull() ?: 1
                if (existing == null) {
                    viewModel.createClass(name, section.ifBlank { null }, branchId, semester, year.ifBlank { "2024-25" })
                } else {
                    viewModel.updateClass(existing.id, name, section.ifBlank { null }, branchId, semester, year.ifBlank { "2024-25" })
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete(cls: SchoolClass) {
        AlertDialog.Builder(requireContext())
            .setTitle("Delete Class")
            .setMessage("Delete '${cls.name} ${cls.section ?: ""}'? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ -> viewModel.deleteClass(cls.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.classes.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.classes
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvCount.text = "${list.size} classes"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.branches.collect { state ->
                if (state is Resource.Success) branches = state.data.branches
            }
        }

        lifecycleScope.launch {
            viewModel.actionState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        Toast.makeText(requireContext(), state.data, Toast.LENGTH_SHORT).show()
                        viewModel.clearActionState()
                        viewModel.loadClasses()
                    }
                    is Resource.Error -> {
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearActionState()
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
