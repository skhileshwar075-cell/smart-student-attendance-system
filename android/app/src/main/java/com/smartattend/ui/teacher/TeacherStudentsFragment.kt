package com.smartattend.ui.teacher

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
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
import com.smartattend.databinding.FragmentTeacherStudentsBinding
import com.smartattend.domain.model.Student
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class TeacherStudentsFragment : Fragment() {

    private var _binding: FragmentTeacherStudentsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TeacherStudentsViewModel by viewModels()
    private lateinit var adapter: TeacherStudentsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTeacherStudentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = TeacherStudentsAdapter(
            onEdit = { student -> showEditDialog(student) },
            onDelete = { student -> confirmDelete(student) }
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

        setupObservers()
    }

    // ── Create Dialog ─────────────────────────────────────────────────────────

    private fun showCreateDialog() {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_student_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etEmail = dialogView.findViewById<TextInputEditText>(R.id.etEmail)
        val etPhone = dialogView.findViewById<TextInputEditText>(R.id.etPhone)
        val etRoll = dialogView.findViewById<TextInputEditText>(R.id.etRollNumber)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Add New Student")
            .setView(dialogView)
            .setPositiveButton("Create") { _, _ ->
                val name = etName.text.toString().trim()
                val email = etEmail.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val roll = etRoll.text.toString().trim()
                if (name.isBlank() || email.isBlank()) {
                    Toast.makeText(requireContext(), "Name and email are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewModel.createStudent(name, email, phone.ifBlank { null }, roll.ifBlank { null })
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Edit Dialog ───────────────────────────────────────────────────────────

    private fun showEditDialog(student: Student) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_student_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etEmail = dialogView.findViewById<TextInputEditText>(R.id.etEmail)
        val etPhone = dialogView.findViewById<TextInputEditText>(R.id.etPhone)
        val etRoll = dialogView.findViewById<TextInputEditText>(R.id.etRollNumber)

        etName.setText(student.name)
        etEmail.setText(student.email)
        etPhone.setText(student.phone ?: "")
        etRoll.setText(student.studentId ?: "")

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Edit Student")
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val name = etName.text.toString().trim()
                val email = etEmail.text.toString().trim()
                val phone = etPhone.text.toString().trim()
                val roll = etRoll.text.toString().trim()
                if (name.isBlank() || email.isBlank()) {
                    Toast.makeText(requireContext(), "Name and email are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewModel.updateStudent(student.id, name, email, phone.ifBlank { null }, roll.ifBlank { null })
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Delete Confirm ────────────────────────────────────────────────────────

    private fun confirmDelete(student: Student) {
        AlertDialog.Builder(requireContext())
            .setTitle("Remove Student")
            .setMessage("Remove ${student.name} from your class? This will deactivate their account.")
            .setPositiveButton("Remove") { _, _ -> viewModel.deleteStudent(student.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.students.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.students
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvCount.text = "${list.size} students"
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

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
