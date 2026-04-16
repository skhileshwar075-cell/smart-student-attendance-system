package com.smartattend.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.smartattend.databinding.ActivityForgotPasswordBinding
import com.smartattend.util.Resource
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

/**
 * ForgotPasswordActivity — 3-step OTP-based password reset flow.
 *
 * Step 1: User enters email → POST /api/auth/forgot-password
 *         (OTP printed to server console in dev mode)
 * Step 2: User enters the 6-digit OTP → POST /api/auth/verify-otp
 *         Server returns a reset_token
 * Step 3: User enters a new password → POST /api/auth/reset-password
 *         Password is updated; user redirected to Login
 */
@AndroidEntryPoint
class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityForgotPasswordBinding
    private val viewModel: ForgotPasswordViewModel by viewModels()

    private var currentStep = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        showStep(1)
        setupListeners()
        setupObservers()
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    private fun showStep(step: Int) {
        currentStep = step
        binding.layoutStep1.visibility = if (step == 1) View.VISIBLE else View.GONE
        binding.layoutStep2.visibility = if (step == 2) View.VISIBLE else View.GONE
        binding.layoutStep3.visibility = if (step == 3) View.VISIBLE else View.GONE
        binding.tvStepIndicator.text = "Step $step of 3"
    }

    // ── Listeners ────────────────────────────────────────────────────────────

    private fun setupListeners() {
        // Step 1 — Send OTP
        binding.btnSendOtp.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            if (email.isBlank()) { showError("Please enter your email address"); return@setOnClickListener }
            viewModel.sendOtp(email)
        }

        // Step 2 — Verify OTP
        binding.btnVerifyOtp.setOnClickListener {
            val otp = binding.etOtp.text.toString().trim()
            if (otp.length != 6) { showError("Enter the 6-digit OTP code"); return@setOnClickListener }
            viewModel.verifyOtp(otp)
        }

        // Step 3 — Reset Password
        binding.btnResetPassword.setOnClickListener {
            val newPwd = binding.etNewPassword.text.toString()
            val confirmPwd = binding.etConfirmPassword.text.toString()
            if (newPwd.length < 6) { showError("Password must be at least 6 characters"); return@setOnClickListener }
            if (newPwd != confirmPwd) { showError("Passwords do not match"); return@setOnClickListener }
            viewModel.resetPassword(newPwd)
        }

        // Back to login link
        binding.tvBackToLogin.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        // Resend OTP (from step 2)
        binding.tvResendOtp.setOnClickListener {
            viewModel.sendOtp(viewModel.pendingEmail)
            Toast.makeText(this, "OTP resent to ${viewModel.pendingEmail}", Toast.LENGTH_SHORT).show()
        }
    }

    // ── Observers ────────────────────────────────────────────────────────────

    private fun setupObservers() {
        // Step 1 observer
        lifecycleScope.launch {
            viewModel.sendState.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnSendOtp.isEnabled = false
                        binding.tvMessage.visibility = View.GONE
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                        showStep(2)
                        binding.tvOtpSentTo.text = "OTP sent to ${viewModel.pendingEmail}\n(Check server console in dev mode)"
                        binding.tvMessage.visibility = View.GONE
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                        showError(state.message)
                    }
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                    }
                }
            }
        }

        // Step 2 observer
        lifecycleScope.launch {
            viewModel.verifyState.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnVerifyOtp.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnVerifyOtp.isEnabled = true
                        showStep(3)
                        binding.tvMessage.visibility = View.GONE
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnVerifyOtp.isEnabled = true
                        showError(state.message)
                    }
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnVerifyOtp.isEnabled = true
                    }
                }
            }
        }

        // Step 3 observer
        lifecycleScope.launch {
            viewModel.resetState.collect { state ->
                when (state) {
                    is Resource.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnResetPassword.isEnabled = false
                    }
                    is Resource.Success -> {
                        binding.progressBar.visibility = View.GONE
                        Toast.makeText(this@ForgotPasswordActivity, "Password reset! Please sign in.", Toast.LENGTH_LONG).show()
                        startActivity(Intent(this@ForgotPasswordActivity, LoginActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        })
                        finish()
                    }
                    is Resource.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnResetPassword.isEnabled = true
                        showError(state.message)
                    }
                    null -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnResetPassword.isEnabled = true
                    }
                }
            }
        }
    }

    private fun showError(msg: String) {
        binding.tvMessage.text = msg
        binding.tvMessage.setTextColor(android.graphics.Color.parseColor("#EF4444"))
        binding.tvMessage.visibility = View.VISIBLE
    }
}
