package com.smartattend.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AnimationUtils
import androidx.appcompat.app.AppCompatActivity
import com.smartattend.R
import com.smartattend.databinding.ActivityHomeBinding
import com.smartattend.ui.auth.LoginActivity
import dagger.hilt.android.AndroidEntryPoint

/**
 * HomeActivity — Public role-selection screen.
 *
 * Shown when no auth token is present (after SplashActivity).
 * User picks their role (Student / Teacher / Admin) → navigates to LoginActivity
 * with the chosen role pre-selected.
 *
 * Architecture: No ViewModel needed here — this is purely a navigation hub.
 */
@AndroidEntryPoint
class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding

    companion object {
        const val EXTRA_ROLE = "extra_role"
        const val ROLE_STUDENT = "student"
        const val ROLE_TEACHER = "teacher"
        const val ROLE_ADMIN   = "admin"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        animateEntrance()
        setupClickListeners()
    }

    private fun animateEntrance() {
        // Ensure views start visible or use a fallback if animations fail
        listOf(binding.cardStudent, binding.cardTeacher, binding.cardAdmin).forEachIndexed { i, card ->
            card.alpha = 1f
            card.translationY = 60f
            card.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(400)
                .setStartDelay((i * 100 + 200).toLong())
                .start()
        }

        binding.btnRegister.alpha = 1f
        binding.btnRegister.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(600)
            .start()
    }

    private fun setupClickListeners() {
        binding.cardStudent.setOnClickListener {
            navigateToLogin(ROLE_STUDENT)
        }

        binding.cardTeacher.setOnClickListener {
            navigateToLogin(ROLE_TEACHER)
        }

        binding.cardAdmin.setOnClickListener {
            navigateToLogin(ROLE_ADMIN)
        }

        binding.btnRegister.setOnClickListener {
            navigateToRegister()
        }

        binding.tvForgotPassword.setOnClickListener {
            navigateToForgotPassword()
        }
    }

    private fun navigateToLogin(role: String) {
        val intent = Intent(this, LoginActivity::class.java).apply {
            putExtra(EXTRA_ROLE, role)
            // Pre-fill demo credentials for dev builds
            if (isDevBuild()) {
                when (role) {
                    ROLE_STUDENT -> {
                        putExtra("demo_email", "aarav@smartattend.edu")
                        putExtra("demo_password", "Student@123")
                    }
                    ROLE_TEACHER -> {
                        putExtra("demo_email", "priya@smartattend.edu")
                        putExtra("demo_password", "Teacher@123")
                    }
                    ROLE_ADMIN -> {
                        putExtra("demo_email", "admin@smartattend.edu")
                        putExtra("demo_password", "Admin@123")
                    }
                }
            }
        }
        startActivity(intent)
        overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right)
    }

    private fun navigateToRegister() {
        startActivity(Intent(this, com.smartattend.ui.auth.RegisterActivity::class.java))
        overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right)
    }

    private fun navigateToForgotPassword() {
        startActivity(Intent(this, com.smartattend.ui.auth.ForgotPasswordActivity::class.java))
        overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right)
    }

    private fun isDevBuild(): Boolean {
        return try {
            val buildConfig = Class.forName("com.smartattend.BuildConfig")
            val debugField = buildConfig.getField("DEBUG")
            debugField.getBoolean(null)
        } catch (e: Exception) {
            false
        }
    }
}
