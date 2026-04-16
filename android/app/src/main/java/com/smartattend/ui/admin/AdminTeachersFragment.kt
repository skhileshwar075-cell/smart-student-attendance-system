package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminTeachersBinding
import com.smartattend.domain.model.Teacher
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminTeachersFragment : Fragment() {

    private var _binding: FragmentAdminTeachersBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminTeachersViewModel by viewModels()
    private lateinit var adapter: AdminTeachersAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminTeachersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminTeachersAdapter(
            onEdit = { teacher -> showEditDialog(teacher) },
            onDelete = { teacher -> confirmDelete(teacher) }
        )
        binding.rvTeachers.layoutManager = LinearLayoutManager(requireContext())
        binding.rvTeachers.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadTeachers() }
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                viewModel.loadTeachers(query?.ifBlank { null })
                return true
            }
            override fun onQueryTextChange(newText: String?): Boolean {
                if (newText.isNullOrBlank()) viewModel.loadTeachers()
                return true
            }
        })

        binding.fabAddTeacher.setOnClickListener { showCreateDialog() }
        setupObservers()
    }

    // ── Dialogs ───────────────────────────────────────────────────────────────

    private fun showCreateDialog() = showTeacherDialog(null)

    private fun showEditDialog(teacher: Teacher) = showTeacherDialog(teacher)

    private fun showTeacherDialog(existing: Teacher?) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_admin_teacher_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etEmail = dialogView.findViewById<TextInputEditText>(R.id.etEmail)
        val etPhone = dialogView.findViewById<TextInputEditText>(R.id.etPhone)
        val etTeacherId = dialogView.findViewById<TextInputEditText>(R.id.etTeacherId)
        val etDepartment = dialogView.findViewById<TextInputEditText>(R.id.etDepartment)
        val etDesignation = dialogView.findViewById<TextInputEditText>(R.id.etDesignation)
        val etPassword = dialogView.findViewById<TextInputEditText>(R.id.etPassword)

        if (existing != null) {
            etName.setText(existing.name)
            etEmail.setText(existing.email)
            etPhone.setText(existing.phone ?: "")
            etTeacherId.setText(existing.teacherId)
            etDepartment.setText(existing.department ?: "")
            etDesignation.setText(existing.designation ?: "")
            etPassword.hint = "Leave blank to keep current"
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (existing == null) "Add Teacher" else "Edit Teacher")
            .setView(dialogView)
            .setPositiveButton(if (existing == null) "Create" else "Save") { _, _ ->
                val name = etName.text.toString().trim()
                val email = etEmail.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val teacherId = etTeacherId.text.toString().trim()
                val dept = etDepartment.text.toString().trim()
                val desig = etDesignation.text.toString().trim()
                val password = etPassword.text.toString().trim()

                if (name.isBlank() || email.isBlank() || teacherId.isBlank()) {
                    Toast.makeText(requireContext(), "Name, email, and teacher ID are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (existing == null) {
                    viewModel.createTeacher(name, email, phone, teacherId, dept, desig, password.ifBlank { null })
                } else {
                    viewModel.updateTeacher(existing.id, name, email, phone, dept, desig, existing.isActive ?: true)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete(teacher: Teacher) {
        AlertDialog.Builder(requireContext())
            .setTitle("Delete Teacher")
            .setMessage("Delete ${teacher.name}? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ -> viewModel.deleteTeacher(teacher.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.teachers.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.teachers
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvCount.text = "${list.size} teachers"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.actionState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        Toast.makeText(requireContext(), state.data, Toast.LENGTH_SHORT).show()
                        viewModel.clearActionState()
                        viewModel.loadTeachers()
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
