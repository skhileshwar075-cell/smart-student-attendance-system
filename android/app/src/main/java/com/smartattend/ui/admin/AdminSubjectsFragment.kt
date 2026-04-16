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
import com.smartattend.R
import com.smartattend.databinding.FragmentAdminSubjectsBinding
import com.smartattend.domain.model.SchoolClass
import com.smartattend.domain.model.Subject
import com.smartattend.domain.model.Teacher
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminSubjectsFragment : Fragment() {

    private var _binding: FragmentAdminSubjectsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminSubjectsViewModel by viewModels()
    private lateinit var adapter: AdminSubjectsAdapter

    private var classes: List<SchoolClass> = emptyList()
    private var teachers: List<Teacher> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminSubjectsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = AdminSubjectsAdapter(
            onEdit = { subject -> showEditDialog(subject) },
            onDelete = { subject -> confirmDelete(subject) }
        )
        binding.rvSubjects.layoutManager = LinearLayoutManager(requireContext())
        binding.rvSubjects.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.loadSubjects() }
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                viewModel.loadSubjects(search = query?.ifBlank { null })
                return true
            }
            override fun onQueryTextChange(newText: String?): Boolean {
                if (newText.isNullOrBlank()) viewModel.loadSubjects()
                return true
            }
        })

        binding.fabAddSubject.setOnClickListener { showCreateDialog() }
        setupObservers()
    }

    // ── Create Dialog ─────────────────────────────────────────────────────────

    private fun showCreateDialog() {
        if (classes.isEmpty() || teachers.isEmpty()) {
            Toast.makeText(requireContext(), "Loading classes and teachers...", Toast.LENGTH_SHORT).show()
            viewModel.loadClasses()
            viewModel.loadTeachers()
            return
        }
        showSubjectDialog(null)
    }

    private fun showEditDialog(subject: Subject) {
        if (classes.isEmpty() || teachers.isEmpty()) {
            Toast.makeText(requireContext(), "Loading dependencies...", Toast.LENGTH_SHORT).show()
            return
        }
        showSubjectDialog(subject)
    }

    private fun showSubjectDialog(existing: Subject?) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_subject_form, null)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etName)
        val etCode = dialogView.findViewById<TextInputEditText>(R.id.etCode)
        val spinnerClass = dialogView.findViewById<Spinner>(R.id.spinnerClass)
        val spinnerTeacher = dialogView.findViewById<Spinner>(R.id.spinnerTeacher)

        val classLabels = classes.map { "${it.name} ${it.section ?: ""}" }
        val teacherLabels = teachers.map { it.name }

        spinnerClass.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, classLabels)
        spinnerTeacher.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, teacherLabels)

        if (existing != null) {
            etName.setText(existing.name)
            etCode.setText(existing.code)
            val classIdx = classes.indexOfFirst { it.id == existing.classId }
            val teacherIdx = teachers.indexOfFirst { it.id == existing.teacherId }
            if (classIdx >= 0) spinnerClass.setSelection(classIdx)
            if (teacherIdx >= 0) spinnerTeacher.setSelection(teacherIdx)
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (existing == null) "Add Subject" else "Edit Subject")
            .setView(dialogView)
            .setPositiveButton(if (existing == null) "Create" else "Save") { _, _ ->
                val name = etName.text.toString().trim()
                val code = etCode.text.toString().trim().uppercase()
                if (name.isBlank() || code.isBlank()) {
                    Toast.makeText(requireContext(), "Name and code are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val selectedClass = classes.getOrNull(spinnerClass.selectedItemPosition)
                val selectedTeacher = teachers.getOrNull(spinnerTeacher.selectedItemPosition)
                if (existing == null) {
                    viewModel.createSubject(name, code, selectedClass?.id, selectedTeacher?.id)
                } else {
                    viewModel.updateSubject(existing.id, name, code, selectedClass?.id, selectedTeacher?.id)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete(subject: Subject) {
        AlertDialog.Builder(requireContext())
            .setTitle("Delete Subject")
            .setMessage("Delete '${subject.name}'? All associated attendance data will be affected.")
            .setPositiveButton("Delete") { _, _ -> viewModel.deleteSubject(subject.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.subjects.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.tvEmpty.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        val list = state.data.subjects
                        adapter.submitList(list)
                        binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                        binding.tvCount.text = "${list.size} subjects"
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.classes.collect { state ->
                if (state is Resource.Success) classes = state.data.classes
            }
        }

        lifecycleScope.launch {
            viewModel.teachers.collect { state ->
                if (state is Resource.Success) teachers = state.data.teachers
            }
        }

        lifecycleScope.launch {
            viewModel.actionState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        Toast.makeText(requireContext(), state.data, Toast.LENGTH_SHORT).show()
                        viewModel.clearActionState()
                        viewModel.loadSubjects()
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
