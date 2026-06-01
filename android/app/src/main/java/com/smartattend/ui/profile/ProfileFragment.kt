package com.smartattend.ui.profile

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.FragmentProfileBinding
import com.smartattend.domain.model.User
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.io.InputStream

@AndroidEntryPoint
class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModels()

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { handleImageSelected(it) }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupClickListeners()
        setupObservers()
    }

    private fun setupClickListeners() {
        binding.btnEditProfile.setOnClickListener {
            startActivity(Intent(requireContext(), EditProfileActivity::class.java))
        }
        binding.btnChangePassword.setOnClickListener {
            startActivity(Intent(requireContext(), ChangePasswordActivity::class.java))
        }
        binding.ivProfilePhoto.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }
        binding.fabEditPhoto.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }
        binding.swipeRefresh.setOnRefreshListener { viewModel.loadProfile() }
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.user.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.swipeRefresh.isRefreshing = true
                        binding.contentLayout.visibility = View.GONE
                        binding.tvError.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.contentLayout.visibility = View.VISIBLE
                        binding.tvError.visibility = View.GONE
                        bindUser(state.data)
                    }
                    is Resource.Error -> {
                        binding.swipeRefresh.isRefreshing = false
                        binding.tvError.visibility = View.VISIBLE
                        binding.tvError.text = state.message
                    }
                }
            }
        }

        lifecycleScope.launch {
            viewModel.photoResult.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressPhoto.visibility = View.VISIBLE
                        binding.fabEditPhoto.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressPhoto.visibility = View.GONE
                        binding.fabEditPhoto.isEnabled = true
                        Toast.makeText(requireContext(), "Profile photo updated!", Toast.LENGTH_SHORT).show()
                        viewModel.clearPhotoResult()
                    }
                    is Resource.Error -> {
                        binding.progressPhoto.visibility = View.GONE
                        binding.fabEditPhoto.isEnabled = true
                        Toast.makeText(requireContext(), "Failed to upload photo: ${state.message}", Toast.LENGTH_SHORT).show()
                        viewModel.clearPhotoResult()
                    }
                    null -> {}
                }
            }
        }
    }

    private fun bindUser(user: User) {
        binding.tvName.text = user.name
        binding.tvEmail.text = user.email
        binding.tvRole.text = user.role.replaceFirstChar { it.uppercase() }
        binding.tvPhone.text = user.phone ?: "Not set"
        binding.tvInitial.text = user.name.firstOrNull()?.uppercase() ?: "?"

        if (user.role == "admin" || user.role == "teacher") {
            binding.cardManagement?.visibility = View.VISIBLE
        }

        if (!user.profilePhoto.isNullOrEmpty()) {
            try {
                val bytes = Base64.decode(user.profilePhoto.substringAfterLast(","), Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                binding.ivProfilePhoto.setImageBitmap(bitmap)
                binding.tvInitial.visibility = View.GONE
                binding.ivProfilePhoto.visibility = View.VISIBLE
            } catch (e: Exception) {
                binding.tvInitial.visibility = View.VISIBLE
            }
        }

        when (user.role) {
            "student" -> {
                binding.tvRoleDetail1Label.text = "Student ID"
                binding.tvRoleDetail1.text = user.studentCode ?: "—"
                binding.tvRoleDetail2Label.text = "Class"
                binding.tvRoleDetail2.text = user.classId ?: "—"
            }
            "teacher" -> {
                binding.tvRoleDetail1Label.text = "Employee ID"
                binding.tvRoleDetail1.text = user.teacherCode ?: "—"
                binding.tvRoleDetail2Label.text = "Department"
                binding.tvRoleDetail2.text = "—"
            }
            "admin" -> {
                binding.tvRoleDetail1Label.text = "Role"
                binding.tvRoleDetail1.text = "System Administrator"
                binding.tvRoleDetail2Label.visibility = View.GONE
                binding.tvRoleDetail2.visibility = View.GONE
            }
        }
    }

    private fun handleImageSelected(uri: Uri) {
        try {
            val inputStream: InputStream? = requireContext().contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)

            val scaledBitmap = scaleBitmap(bitmap, 512)
            binding.ivProfilePhoto.setImageBitmap(scaledBitmap)
            binding.tvInitial.visibility = View.GONE
            binding.ivProfilePhoto.visibility = View.VISIBLE

            val outputStream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
            val bytes = outputStream.toByteArray()
            val base64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)

            viewModel.uploadProfilePhoto(base64)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Failed to process image", Toast.LENGTH_SHORT).show()
        }
    }

    private fun scaleBitmap(bitmap: Bitmap, maxSize: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        if (width <= maxSize && height <= maxSize) return bitmap
        val scale = maxSize.toFloat() / maxOf(width, height)
        return Bitmap.createScaledBitmap(bitmap, (width * scale).toInt(), (height * scale).toInt(), true)
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadProfile()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
