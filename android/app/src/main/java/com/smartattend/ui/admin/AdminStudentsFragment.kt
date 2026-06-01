package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminStudentsBinding
import com.smartattend.domain.model.SchoolClass
import com.smartattend.domain.model.Student
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminStudentsFragment : Fragment() {

    private var _binding: FragmentAdminStudentsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminStudentsViewModel by viewModels()
    private lateinit var adapter: AdminStudentsAdapter

    private var classes: List<SchoolClass> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminStudentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminStudentsAdapter(
            onEdit = { student -> showEditDialog(student) },
            onDelete = { student -> confirmDelete(student) },
            onActivate = { student -> confirmActivate(student) }
        )
        binding.rvStudents.layoutManager = LinearLayoutManager(requireContext())
        binding.rvStudents.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadStudents() }
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                viewModel.loadStudents(query?.ifBlank { null })
                return true
            }
            override fun onQueryTextChange(newText: String?): Boolean {
                if (newText.isNullOrBlank()) viewModel.loadStudents()
                return true
            }
        })

        binding.fabAddStudent.setOnClickListener { showCreateDialog() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.loadStudents() }
        setupObservers()
    }

    // ── Dialogs ───────────────────────────────────────────────────────────────

    private fun showCreateDialog() = showStudentDialog(null)

    private fun showEditDialog(student: Student) = showStudentDialog(student)

    private fun showStudentDialog(existing: Student?) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_admin_student_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etEmail = dialogView.findViewById<TextInputEditText>(R.id.etEmail)
        val etPhone = dialogView.findViewById<TextInputEditText>(R.id.etPhone)
        val etStudentId = dialogView.findViewById<TextInputEditText>(R.id.etStudentId)
        val etRoll = dialogView.findViewById<TextInputEditText>(R.id.etRollNumber)
        val etPassword = dialogView.findViewById<TextInputEditText>(R.id.etPassword)
        val spinnerClass = dialogView.findViewById<Spinner>(R.id.spinnerClass)

        val classLabels = listOf("— No class —") + classes.map { 
            "${it.branchName ?: "No Branch"} — ${it.name} ${it.section ?: ""}".trim() + (it.semester?.let { sem -> " (Sem $sem)" } ?: "")
        }
        spinnerClass.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, classLabels)

        if (existing != null) {
            etName.setText(existing.name)
            etEmail.setText(existing.email)
            etPhone.setText(existing.phone ?: "")
            etStudentId.setText(existing.studentId)
            etStudentId.isEnabled = false // Student ID is usually immutable
            etRoll.setText(existing.rollNumber ?: "")
            val classIdx = classes.indexOfFirst { it.id == existing.classId }
            if (classIdx >= 0) spinnerClass.setSelection(classIdx + 1)
            etPassword.hint = "Leave blank to keep current"
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (existing == null) "Add Student" else "Edit Student")
            .setView(dialogView)
            .setPositiveButton(if (existing == null) "Create" else "Save") { _, _ ->
                val name = etName.text.toString().trim()
                val email = etEmail.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val studentId = etStudentId.text.toString().trim()
                val roll = etRoll.text.toString().trim()
                val password = etPassword.text.toString().trim()
                val selectedIdx = spinnerClass.selectedItemPosition
                val classId = if (selectedIdx > 0) classes.getOrNull(selectedIdx - 1)?.id else null

                if (name.isBlank() || email.isBlank() || studentId.isBlank() || roll.isBlank()) {
                    Toast.makeText(requireContext(), "Name, email, student ID, and roll number are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (existing == null) {
                    viewModel.createStudent(name, email, phone, studentId, classId, roll, password.ifBlank { null })
                } else {
                    viewModel.updateStudent(
                        existing.id, name, email, phone, classId, roll,
                        existing.isActive ?: true
                    )
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmActivate(student: Student) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Activate Student")
            .setMessage("Enable account for ${student.name}?")
            .setPositiveButton("Activate") { _, _ ->
                viewModel.updateStudent(
                    student.id, student.name, student.email, student.phone ?: "",
                    student.classId, student.rollNumber ?: "", true
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete(student: Student) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Deactivate Student")
            .setMessage("Are you sure you want to deactivate ${student.name}? They will no longer be able to log in.")
            .setPositiveButton("Deactivate") { _, _ -> viewModel.deleteStudent(student.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.students.collectLatest { state ->
                    when (state) {
                        is Resource.Loading -> {
                            binding.swipeRefresh.isRefreshing = true
                            binding.layoutEmpty.root.visibility = View.GONE
                        }
                        is Resource.Success -> {
                            binding.swipeRefresh.isRefreshing = false
                            val list = state.data.students
                            adapter.submitList(list)
                            
                            val isEmpty = list.isEmpty()
                            binding.layoutEmpty.root.visibility = if (isEmpty) View.VISIBLE else View.GONE
                            if (isEmpty) {
                                binding.layoutEmpty.tvEmptyTitle.text = "No Students Found"
                                binding.layoutEmpty.tvEmptyMessage.text = "Try a different search or add a student."
                                binding.layoutEmpty.btnRetry.visibility = View.GONE
                            }
                            binding.tvCount.text = "${list.size} students"
                        }
                        is Resource.Error -> {
                            binding.swipeRefresh.isRefreshing = false
                            binding.layoutEmpty.root.visibility = View.VISIBLE
                            binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Students"
                            binding.layoutEmpty.tvEmptyMessage.text = state.message
                            binding.layoutEmpty.btnRetry.visibility = View.VISIBLE
                            binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.loadStudents() }
                        }
                    }
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.classes.collectLatest { state ->
                    if (state is Resource.Success) classes = state.data.classes
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.actionState.collectLatest { state ->
                    when (state) {
                        is Resource.Success -> {
                            Toast.makeText(requireContext(), state.data, Toast.LENGTH_SHORT).show()
                            viewModel.clearActionState()
                            viewModel.loadStudents()
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
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
