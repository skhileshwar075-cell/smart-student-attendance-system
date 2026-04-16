package com.smartattend.ui.profile

import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.ActivityEditProfileBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class EditProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEditProfileBinding
    private val viewModel: ProfileViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEditProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Edit Profile"

        setupObservers()
        setupClickListeners()
    }

    private fun setupClickListeners() {
        binding.btnSave.setOnClickListener {
            val name = binding.etName.text.toString().trim()
            val phone = binding.etPhone.text.toString().trim()

            if (name.isEmpty()) {
                binding.tilName.error = "Name is required"
                return@setOnClickListener
            }
            binding.tilName.error = null
            viewModel.updateProfile(name, phone)
        }
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.user.collect { state ->
                if (state is Resource.Success) {
                    binding.etName.setText(state.data.name)
                    binding.etPhone.setText(state.data.phone ?: "")
                }
            }
        }

        lifecycleScope.launch {
            viewModel.updateResult.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnSave.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSave.isEnabled = true
                        Toast.makeText(this@EditProfileActivity, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
                        viewModel.clearUpdateResult()
                        finish()
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSave.isEnabled = true
                        Toast.makeText(this@EditProfileActivity, state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearUpdateResult()
                    }
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSave.isEnabled = true
                    }
                }
            }
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) { onBackPressedDispatcher.onBackPressed(); return true }
        return super.onOptionsItemSelected(item)
    }
}
