package com.smartattend.ui.profile

import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.ActivityChangePasswordBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class ChangePasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChangePasswordBinding
    private val viewModel: ProfileViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChangePasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Change Password"

        setupObservers()
        setupClickListeners()
    }

    private fun setupClickListeners() {
        binding.btnChangePassword.setOnClickListener {
            val current = binding.etCurrentPassword.text.toString()
            val newPwd  = binding.etNewPassword.text.toString()
            val confirm = binding.etConfirmPassword.text.toString()

            var valid = true
            if (current.isEmpty()) { binding.tilCurrentPassword.error = "Required"; valid = false } else binding.tilCurrentPassword.error = null
            if (newPwd.length < 6) { binding.tilNewPassword.error = "Min 6 characters"; valid = false } else binding.tilNewPassword.error = null
            if (newPwd != confirm) { binding.tilConfirmPassword.error = "Passwords do not match"; valid = false } else binding.tilConfirmPassword.error = null

            if (!valid) return@setOnClickListener
            viewModel.changePassword(current, newPwd)
        }
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.passwordResult.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnChangePassword.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnChangePassword.isEnabled = true
                        Toast.makeText(this@ChangePasswordActivity, "Password changed successfully!", Toast.LENGTH_SHORT).show()
                        viewModel.clearPasswordResult()
                        binding.etCurrentPassword.text?.clear()
                        binding.etNewPassword.text?.clear()
                        binding.etConfirmPassword.text?.clear()
                        finish()
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnChangePassword.isEnabled = true
                        Toast.makeText(this@ChangePasswordActivity, state.message, Toast.LENGTH_LONG).show()
                        viewModel.clearPasswordResult()
                    }
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnChangePassword.isEnabled = true
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
