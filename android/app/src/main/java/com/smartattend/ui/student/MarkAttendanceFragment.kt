package com.smartattend.ui.student

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.*
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.smartattend.databinding.FragmentMarkAttendanceBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@AndroidEntryPoint
class MarkAttendanceFragment : Fragment() {

    private var _binding: FragmentMarkAttendanceBinding? = null
    private val binding get() = _binding!!
    private val viewModel: MarkAttendanceViewModel by viewModels()

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var cameraExecutor: ExecutorService
    private var faceDetector: FaceDetector? = null
    private var currentLat: Double? = null
    private var currentLng: Double? = null
    private var faceVerified = false
    private var attemptCount = 0

    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { perms ->
        if (perms[Manifest.permission.CAMERA] == true) startCamera()
        if (perms[Manifest.permission.ACCESS_FINE_LOCATION] == true) getLocation()
    }

    private val qrScanLauncher = registerForActivityResult(ScanContract()) { result ->
        result.contents?.let { qrData ->
            // Parse QR: SMARTATTEND:{subjectId}:{code}:{timestamp}
            val parts = qrData.split(":")
            if (parts.size >= 4 && parts[0] == "SMARTATTEND") {
                viewModel.markByCode(parts[2], currentLat, currentLng, faceVerified)
            } else {
                showToast("Invalid QR code")
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMarkAttendanceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        cameraExecutor = Executors.newSingleThreadExecutor()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())
        setupFaceDetector()
        setupObservers()
        setupListeners()
        requestPermissions()
        viewModel.loadActiveSessions()
    }

    private fun setupFaceDetector() {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .setMinFaceSize(0.15f)
            .enableTracking()
            .build()
        faceDetector = FaceDetection.getClient(options)
    }

    private fun setupListeners() {
        // Mark by attendance code
        binding.btnMarkByCode.setOnClickListener {
            val code = binding.etAttendanceCode.text.toString().trim().uppercase()
            if (code.isEmpty()) { showToast("Enter attendance code"); return@setOnClickListener }
            attemptCount++
            viewModel.markByCode(code, currentLat, currentLng, faceVerified, attemptCount)
        }

        // Scan QR code
        binding.btnScanQR.setOnClickListener {
            val options = ScanOptions().apply {
                setPrompt("Scan attendance QR code")
                setBeepEnabled(true)
                setOrientationLocked(false)
            }
            qrScanLauncher.launch(options)
        }

        // Mark from active session
        binding.btnMarkFromSession.setOnClickListener {
            val session = viewModel.selectedSession.value
            if (session == null) { showToast("Select an active session first"); return@setOnClickListener }
            attemptCount++
            viewModel.markBySession(session.id, currentLat, currentLng, faceVerified, attemptCount)
        }

        // Toggle face verification
        binding.switchFaceVerification.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) startCamera() else stopCamera()
        }

        // Refresh location
        binding.btnRefreshLocation.setOnClickListener { getLocation() }

        // Session selection
        binding.rvActiveSessions.adapter = ActiveSessionsAdapter { session ->
            viewModel.selectSession(session)
            binding.tvSelectedSession.text = "Selected: ${session.subjectName}"
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.cameraPreview.surfaceProvider)
            }
            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        processFaceDetection(imageProxy)
                    }
                }
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(viewLifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageAnalyzer)
                binding.cameraContainer.visibility = View.VISIBLE
            } catch (e: Exception) {
                showToast("Camera error: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun stopCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            try {
                cameraProviderFuture.get().unbindAll()
            } catch (e: Exception) {
                // Camera already unbound or context gone
            }
            binding.cameraContainer.visibility = View.GONE
            faceVerified = false
            binding.tvFaceStatus.text = "Face not verified"
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun processFaceDetection(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image ?: run { imageProxy.close(); return }
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        faceDetector?.process(image)
            ?.addOnSuccessListener { faces ->
                if (faces.isNotEmpty()) {
                    val face = faces[0]
                    // Liveness check: ensure eyes are open
                    val leftEyeOpen = face.leftEyeOpenProbability ?: 0f
                    val rightEyeOpen = face.rightEyeOpenProbability ?: 0f
                    val isLive = leftEyeOpen > 0.5f && rightEyeOpen > 0.5f

                    requireActivity().runOnUiThread {
                        if (isLive) {
                            faceVerified = true
                            binding.tvFaceStatus.text = "Face verified ✓"
                            binding.tvFaceStatus.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_green_dark))
                            // Detect anomaly: head movement unexpectedly rapid
                            detectFaceAnomaly(face)
                        } else {
                            binding.tvFaceStatus.text = "Keep eyes open"
                        }
                    }
                } else {
                    requireActivity().runOnUiThread {
                        faceVerified = false
                        binding.tvFaceStatus.text = "No face detected"
                    }
                }
                imageProxy.close()
            }
            ?.addOnFailureListener { imageProxy.close() }
    }

    private fun detectFaceAnomaly(face: Face) {
        val eulerY = face.headEulerAngleY
        val eulerZ = face.headEulerAngleZ
        // Anomaly: suspicious head rotation (could be using a photo)
        if (Math.abs(eulerY) > 40 || Math.abs(eulerZ) > 40) {
            viewModel.flagAnomaly("Suspicious head angle detected — possible photo spoof")
        }
    }

    private fun getLocation() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { location ->
                    location?.let {
                        currentLat = it.latitude
                        currentLng = it.longitude
                        binding.tvLocationStatus.text = "Location: ${String.format("%.4f", it.latitude)}, ${String.format("%.4f", it.longitude)}"
                        binding.tvLocationStatus.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_green_dark))
                    }
                }
                .addOnFailureListener {
                    binding.tvLocationStatus.text = "Location unavailable"
                }
        }
    }

    private fun requestPermissions() {
        val perms = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION)
        val needed = perms.filter { ContextCompat.checkSelfPermission(requireContext(), it) != PackageManager.PERMISSION_GRANTED }
        if (needed.isNotEmpty()) permissionLauncher.launch(needed.toTypedArray())
        else { startCamera(); getLocation() }
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.markState.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnMarkByCode.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnMarkByCode.isEnabled = true
                        showToast(state.data.message)
                        viewModel.loadActiveSessions()
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnMarkByCode.isEnabled = true
                        showToast(state.message)
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.sessions.collect { sessions ->
                (binding.rvActiveSessions.adapter as? ActiveSessionsAdapter)?.submitList(sessions)
                binding.tvNoSessions.visibility = if (sessions.isEmpty()) View.VISIBLE else View.GONE
            }
        }
    }

    private fun showToast(msg: String) = Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()

    override fun onDestroyView() {
        super.onDestroyView()
        cameraExecutor.shutdown()
        faceDetector?.close()
        _binding = null
    }
}
