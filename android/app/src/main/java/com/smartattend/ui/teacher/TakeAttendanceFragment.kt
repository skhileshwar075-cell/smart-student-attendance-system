package com.smartattend.ui.teacher

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.gms.location.*
import com.smartattend.databinding.FragmentTakeAttendanceBinding
import com.smartattend.domain.model.AttendanceRecordInput
import com.smartattend.domain.model.AttendanceSession
import com.smartattend.domain.model.Subject
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class TakeAttendanceFragment : Fragment() {

    private var _binding: FragmentTakeAttendanceBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TakeAttendanceViewModel by viewModels()

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var activeSessionsAdapter: ActiveSessionsAdapter

    private var selectedSubject: Subject? = null
    private var geoLat: Double? = null
    private var geoLng: Double? = null
    private var sessionType = "manual"

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) captureLocation()
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTakeAttendanceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())
        setupActiveSessionsRecycler()
        setupObservers()
        setupListeners()
        viewModel.loadSubjects()
        viewModel.loadActiveSessions()
        viewModel.startPolling()
    }

    override fun onDestroyView() {
        activeSessionsAdapter.cancelAllTimers()
        viewModel.stopPolling()
        super.onDestroyView()
        _binding = null
    }

    // ── Active sessions embedded RecyclerView ─────────────────────────────────

    private fun setupActiveSessionsRecycler() {
        activeSessionsAdapter = ActiveSessionsAdapter(
            onStopClick = { session -> confirmStop(session) },
            onSessionExpired = { session -> viewModel.onSessionExpiredLocally(session) }
        )
        binding.rvActiveSessions.layoutManager = LinearLayoutManager(requireContext())
        binding.rvActiveSessions.adapter = activeSessionsAdapter
        binding.rvActiveSessions.isNestedScrollingEnabled = false
    }

    private fun confirmStop(session: AttendanceSession) {
        AlertDialog.Builder(requireContext())
            .setTitle("Stop Session?")
            .setMessage(
                "Stop the '${session.sessionType.replaceFirstChar { it.uppercase() }}' session " +
                "for '${session.subjectName ?: "this subject"}'?\n\n" +
                "Students will immediately lose the ability to mark attendance."
            )
            .setPositiveButton("Stop") { _, _ -> viewModel.stopSession(session.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Listeners ─────────────────────────────────────────────────────────────

    private fun setupListeners() {
        // Session type chips
        binding.chipManual.setOnClickListener { sessionType = "manual"; updateModeUI() }
        binding.chipCode.setOnClickListener   { sessionType = "code";   updateModeUI() }
        binding.chipQR.setOnClickListener     { sessionType = "qr";     updateModeUI() }
        binding.chipSecure.setOnClickListener { sessionType = "secure"; updateModeUI() }

        // Subject spinner
        binding.spinnerSubject.setOnItemSelectedListener { pos ->
            selectedSubject = viewModel.subjects.value?.getOrNull(pos)
            if (sessionType == "manual") viewModel.loadStudents(selectedSubject?.id)
        }

        // Start session
        binding.btnStartSession.setOnClickListener {
            val subject = selectedSubject
                ?: run { showToast("Select a subject first"); return@setOnClickListener }
            val useGeo = binding.switchGeoFence.isChecked
            viewModel.createSession(
                subjectId = subject.id,
                type = sessionType,
                geoLat = if (useGeo) geoLat else null,
                geoLng = if (useGeo) geoLng else null,
                geoRadius = if (useGeo) 100 else null
            )
        }

        // Stop current session (the one just created in this screen)
        binding.btnStopSession.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Stop Session?")
                .setMessage("Stop the current session? Students will no longer be able to mark attendance.")
                .setPositiveButton("Stop") { _, _ -> viewModel.stopCurrentSession() }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Geofence toggle
        binding.switchGeoFence.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                if (ContextCompat.checkSelfPermission(
                        requireContext(), Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                ) captureLocation()
                else locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            }
        }

        // Manual attendance controls
        binding.btnSaveAttendance.setOnClickListener {
            val subject = selectedSubject
                ?: run { showToast("Select a subject first"); return@setOnClickListener }
            val records = (binding.rvStudents.adapter as? ManualAttendanceAdapter)
                ?.getRecords() ?: emptyList()
            if (records.isEmpty()) { showToast("No students loaded"); return@setOnClickListener }
            viewModel.saveManualAttendance(subject.id, null, records)
        }
        binding.btnAllPresent.setOnClickListener {
            (binding.rvStudents.adapter as? ManualAttendanceAdapter)?.markAll("present")
        }
        binding.btnAllAbsent.setOnClickListener {
            (binding.rvStudents.adapter as? ManualAttendanceAdapter)?.markAll("absent")
        }
        binding.btnSendAlerts.setOnClickListener {
            viewModel.sendLowAttendanceAlerts(selectedSubject?.id)
        }
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.subjects.collect { subjects ->
                if (subjects != null) {
                    val adapter = ArrayAdapter(
                        requireContext(),
                        android.R.layout.simple_spinner_item,
                        subjects.map { "${it.name} — ${it.className}" }
                    )
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    binding.spinnerSubject.adapter = adapter
                    selectedSubject = subjects.firstOrNull()
                }
            }
        }

        lifecycleScope.launch {
            viewModel.students.collect { students ->
                if (students != null) {
                    binding.rvStudents.adapter = ManualAttendanceAdapter(students)
                    binding.tvStudentCount.text = "${students.size} students"
                }
            }
        }

        lifecycleScope.launch {
            viewModel.sessionState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        binding.sessionCodeLayout.visibility = View.VISIBLE
                        binding.tvSessionCode.text = state.data.code ?: "—"
                        binding.btnStartSession.visibility = View.GONE
                        binding.btnStopSession.visibility = View.VISIBLE
                        showToast("Session started! Code: ${state.data.code}")
                    }
                    is Resource.Error -> {
                        showErrorDialog(viewModel.parseErrorMessage(state.message))
                    }
                    Resource.Loading -> {}
                }
            }
        }

        lifecycleScope.launch {
            viewModel.saveState.collect { state ->
                when (state) {
                    is Resource.Success -> showToast(state.data.message)
                    is Resource.Error   -> showToast(state.message)
                    else -> {}
                }
            }
        }

        // ── Active sessions section ────────────────────────────────────────────
        lifecycleScope.launch {
            viewModel.activeSessionsLoading.collect { loading ->
                binding.activeSessionsProgress.visibility =
                    if (loading) View.VISIBLE else View.GONE
            }
        }

        lifecycleScope.launch {
            viewModel.activeSessions.collect { sessions ->
                activeSessionsAdapter.submitList(sessions)
                updateActiveSessionsEmptyState(sessions)
            }
        }

        lifecycleScope.launch {
            viewModel.stopState.collect { state ->
                when (state) {
                    is Resource.Success -> {
                        showToast("Session stopped")
                        // Reset start/stop buttons if current session was stopped
                        binding.btnStartSession.visibility = View.VISIBLE
                        binding.btnStopSession.visibility = View.GONE
                        binding.sessionCodeLayout.visibility = View.GONE
                        viewModel.clearStopState()
                    }
                    is Resource.Error -> {
                        showToast(viewModel.parseErrorMessage(state.message))
                        viewModel.clearStopState()
                    }
                    else -> {}
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun updateActiveSessionsEmptyState(sessions: List<AttendanceSession>) {
        if (sessions.isEmpty()) {
            binding.tvNoActiveSessions.visibility = View.VISIBLE
            binding.rvActiveSessions.visibility   = View.GONE
        } else {
            binding.tvNoActiveSessions.visibility = View.GONE
            binding.rvActiveSessions.visibility   = View.VISIBLE
        }
    }

    private fun updateModeUI() {
        binding.sessionControlLayout.visibility =
            if (sessionType != "manual") View.VISIBLE else View.GONE
        binding.manualAttendanceLayout.visibility =
            if (sessionType == "manual") View.VISIBLE else View.GONE
    }

    private fun captureLocation() {
        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { location ->
                    location?.let {
                        geoLat = it.latitude
                        geoLng = it.longitude
                        binding.tvGeoStatus.text =
                            "📍 Location captured (${String.format("%.4f", it.latitude)}, ${
                                String.format("%.4f", it.longitude)
                            })"
                    }
                }
        }
    }

    private fun showToast(msg: String) =
        Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()

    private fun showErrorDialog(message: String) {
        if (!isAdded) return
        AlertDialog.Builder(requireContext())
            .setTitle("Cannot Create Session")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun android.widget.Spinner.setOnItemSelectedListener(action: (Int) -> Unit) {
        onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: android.widget.AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) = action(position)
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
        }
    }
}
