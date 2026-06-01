package com.smartattend.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.smartattend.databinding.ActivityLoginBinding
import com.smartattend.ui.MainActivity
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val viewModel: LoginViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString()

            if (email.isEmpty()) { binding.tilEmail.error = "Email required"; return@setOnClickListener }
            if (password.isEmpty()) { binding.tilPassword.error = "Password required"; return@setOnClickListener }

            binding.tilEmail.error = null
            binding.tilPassword.error = null
            viewModel.login(email, password)
        }

        // Demo credentials listeners
        binding.chipAdmin.setOnClickListener {
            binding.etEmail.setText("admin@smartattend.edu")
            binding.etPassword.setText("Admin@123")
            binding.tvRoleLabel.text = "Signing in as Admin"
        }

        binding.chipTeacher.setOnClickListener {
            binding.etEmail.setText("priya@smartattend.edu")
            binding.etPassword.setText("Teacher@123")
            binding.tvRoleLabel.text = "Signing in as Teacher"
        }

        binding.chipStudent.setOnClickListener {
            binding.etEmail.setText("aarav@smartattend.edu")
            binding.etPassword.setText("Student@123")
            binding.tvRoleLabel.text = "Signing in as Student"
        }

        binding.tvForgotPassword.setOnClickListener {
            startActivity(Intent(this, ForgotPasswordActivity::class.java))
        }

        try {
            binding.tvRegister?.setOnClickListener {
                startActivity(Intent(this, RegisterActivity::class.java))
            }
        } catch (_: Exception) {}
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.loginState.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.btnLogin.isEnabled = false
                        binding.progressBar.visibility = View.VISIBLE
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        startActivity(Intent(this@LoginActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        })
                        finish()
                    }
                    is Resource.Error -> {
                        binding.btnLogin.isEnabled = true
                        binding.progressBar.visibility = View.GONE
                        Snackbar.make(binding.root, state.message, Snackbar.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}
