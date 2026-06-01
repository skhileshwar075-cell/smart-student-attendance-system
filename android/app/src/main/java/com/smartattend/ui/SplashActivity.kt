package com.smartattend.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.smartattend.R
import com.smartattend.databinding.ActivitySplashBinding
import com.smartattend.util.TokenManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    @Inject
    lateinit var tokenManager: TokenManager

    private val SPLASH_DURATION = 2000L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )

        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        animateElements()
        navigateAfterDelay()
    }

    private fun animateElements() {
        // Ensure elements are visible by default to prevent black screen if animations are blocked
        binding.cardLogo.alpha = 1f
        binding.cardLogo.scaleX = 1f
        binding.cardLogo.scaleY = 1f
        
        binding.tvAppName.alpha = 1f
        binding.tvTagline.alpha = 1f
        binding.progressSplash.alpha = 1f

        // Run animations as an enhancement
        binding.cardLogo.animate()
            .scaleX(1.1f).scaleY(1.1f)
            .setDuration(1000)
            .withEndAction {
                binding.cardLogo.animate().scaleX(1f).scaleY(1f).setDuration(1000).start()
            }
            .start()
    }

    private fun navigateAfterDelay() {
        lifecycleScope.launch {
            delay(SPLASH_DURATION)
            val isLoggedIn = tokenManager.isLoggedIn()
            val destination = if (isLoggedIn) {
                Intent(this@SplashActivity, MainActivity::class.java)
            } else {
                Intent(this@SplashActivity, HomeActivity::class.java)
            }
            destination.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(destination)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }
    }
}
