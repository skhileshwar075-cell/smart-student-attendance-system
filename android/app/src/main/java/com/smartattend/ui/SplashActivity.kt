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
        binding.cardLogo.alpha = 0f
        binding.cardLogo.scaleX = 0.6f
        binding.cardLogo.scaleY = 0.6f
        binding.cardLogo.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(600)
            .setStartDelay(100)
            .start()

        binding.tvAppName.alpha = 0f
        binding.tvAppName.translationY = 30f
        binding.tvAppName.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(500)
            .setStartDelay(400)
            .start()

        binding.tvTagline.alpha = 0f
        binding.tvTagline.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(700)
            .start()

        binding.progressSplash.alpha = 0f
        binding.progressSplash.animate()
            .alpha(1f)
            .setDuration(300)
            .setStartDelay(900)
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
