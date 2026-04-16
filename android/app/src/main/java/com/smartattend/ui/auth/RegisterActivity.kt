package com.smartattend.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.ActivityRegisterBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val viewModel: RegisterViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val roles = listOf("student", "teacher")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerRole.adapter = adapter

        binding.btnRegister.setOnClickListener { attemptRegister() }
        binding.tvLogin.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        setupObservers()
    }

    private fun attemptRegister() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val role = binding.spinnerRole.selectedItem?.toString() ?: "student"

        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            binding.tvError.text = "All fields are required"
            binding.tvError.visibility = View.VISIBLE
            return
        }
        binding.tvError.visibility = View.GONE
        viewModel.register(name, email, password, role)
    }

    private fun setupObservers() {
        lifecycleScope.launch {
            viewModel.registerState.collect { state ->
                when (state) {
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnRegister.isEnabled = true
                    }
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnRegister.isEnabled = false
                        binding.tvError.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        Toast.makeText(this@RegisterActivity, "Account created! Please sign in.", Toast.LENGTH_LONG).show()
                        startActivity(Intent(this@RegisterActivity, LoginActivity::class.java))
                        finish()
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnRegister.isEnabled = true
                        binding.tvError.text = state.message
                        binding.tvError.visibility = View.VISIBLE
                    }
                }
            }
        }
    }
}
