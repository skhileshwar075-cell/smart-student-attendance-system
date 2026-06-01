package com.smartattend.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.smartattend.databinding.FragmentAdminLowAttendanceBinding
import com.smartattend.domain.model.ClassesResponse
import com.smartattend.domain.model.SubjectsResponse
import com.smartattend.domain.model.LowAttendanceResponse
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class AdminLowAttendanceFragment : Fragment() {

    private var _binding: FragmentAdminLowAttendanceBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AdminLowAttendanceViewModel by viewModels()
    private lateinit var adapter: AdminLowAttendanceAdapter

    private val classIds = mutableListOf<String?>(null)
    private val subjectIds = mutableListOf<String?>(null)
    private var selectedClassId: String? = null
    private var selectedSubjectId: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdminLowAttendanceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = AdminLowAttendanceAdapter()
        binding.rvLowAttendance.layoutManager = LinearLayoutManager(requireContext())
        binding.rvLowAttendance.adapter = adapter

        val classAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, mutableListOf<String>())
        classAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerClass.adapter = classAdapter

        val subjectAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, mutableListOf<String>())
        subjectAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerSubject.adapter = subjectAdapter

        binding.spinnerClass.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedClassId = classIds.getOrNull(position)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.spinnerSubject.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedSubjectId = subjectIds.getOrNull(position)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.seekThreshold.setOnSeekBarChangeListener(object : android.widget.SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: android.widget.SeekBar?, progress: Int, fromUser: Boolean) {
                binding.tvThresholdLabel.text = "Below ${progress + 1}%"
            }

            override fun onStartTrackingTouch(seekBar: android.widget.SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: android.widget.SeekBar?) {}
        })

        binding.btnLoadShortlist.setOnClickListener { loadShortlist() }
        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }
        binding.layoutEmpty.btnRetry.setOnClickListener { viewModel.load() }

        setupObservers()
        viewModel.loadLookups()
        viewModel.load()
    }

    private fun setupObservers() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.classes.collectLatest { state ->
                        if (state is Resource.Success) populateFilters(state.data)
                    }
                }

                launch {
                    viewModel.subjects.collectLatest { state ->
                        if (state is Resource.Success) populateSubjects(state.data)
                    }
                }

                launch {
                    viewModel.shortlist.collectLatest { state ->
                        when (state) {
                            is Resource.Loading -> {
                                binding.swipeRefresh.isRefreshing = true
                                binding.rvLowAttendance.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.GONE
                            }
                            is Resource.Success -> {
                                binding.swipeRefresh.isRefreshing = false
                                val students = state.data.students
                                adapter.submitList(students)
                                binding.tvRowCount.text = "${students.size} students"
                                
                                if (students.isEmpty()) {
                                    binding.rvLowAttendance.visibility = View.GONE
                                    binding.layoutEmpty.root.visibility = View.VISIBLE
                                    binding.layoutEmpty.tvEmptyTitle.text = "No students found"
                                    binding.layoutEmpty.tvEmptyMessage.text = "No students in the shortlist for the selected criteria"
                                } else {
                                    binding.rvLowAttendance.visibility = View.VISIBLE
                                    binding.layoutEmpty.root.visibility = View.GONE
                                }
                            }
                            is Resource.Error -> {
                                binding.swipeRefresh.isRefreshing = false
                                binding.rvLowAttendance.visibility = View.GONE
                                binding.layoutEmpty.root.visibility = View.VISIBLE
                                binding.layoutEmpty.tvEmptyTitle.text = "Error Loading Data"
                                binding.layoutEmpty.tvEmptyMessage.text = state.message
                            }
                        }
                    }
                }
            }
        }
    }

    private fun populateFilters(data: ClassesResponse) {
        val items = mutableListOf("All classes")
        classIds.clear()
        classIds.add(null)
        data.classes.forEach {
            items.add("${it.name}${it.section?.let { section -> " - $section" } ?: ""}")
            classIds.add(it.id)
        }
        (binding.spinnerClass.adapter as? ArrayAdapter<String>)?.let {
            it.clear()
            it.addAll(items)
            it.notifyDataSetChanged()
        }
    }

    private fun populateSubjects(data: SubjectsResponse) {
        val items = mutableListOf("All subjects")
        subjectIds.clear()
        subjectIds.add(null)
        data.subjects.forEach {
            items.add(it.name)
            subjectIds.add(it.id)
        }
        (binding.spinnerSubject.adapter as? ArrayAdapter<String>)?.let {
            it.clear()
            it.addAll(items)
            it.notifyDataSetChanged()
        }
    }

    private fun loadShortlist() {
        viewModel.load(
            classId = selectedClassId,
            subjectId = selectedSubjectId,
            from = binding.etFrom.text.toString().takeIf { it.isNotBlank() },
            to = binding.etTo.text.toString().takeIf { it.isNotBlank() },
            threshold = binding.seekThreshold.progress + 1,
            search = binding.etSearch.text.toString().takeIf { it.isNotBlank() }
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
