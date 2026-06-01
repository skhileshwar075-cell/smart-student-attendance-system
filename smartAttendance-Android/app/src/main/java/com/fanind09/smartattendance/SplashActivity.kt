package com.fanind09.smartattendance

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.fanind09.smartattendance.databinding.ActivitySplashBinding
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding
    private val SPLASH_DURATION = 2000L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Make it full screen immersive
        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )

        animateElements()
        navigateAfterDelay()
    }

    private fun animateElements() {
        // Initial states for the main content group
        binding.contentLayout.alpha = 0f
        binding.contentLayout.scaleX = 0.8f
        binding.contentLayout.scaleY = 0.8f
        
        // Animate the whole content group (Logo + Name + Tagline)
        binding.contentLayout.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(1200)
            .setInterpolator(android.view.animation.OvershootInterpolator(1.2f))
            .start()

        // Animate the progress bar separately
        binding.progressSplash.alpha = 0f
        binding.progressSplash.animate()
            .alpha(1f)
            .setDuration(600)
            .setStartDelay(800)
            .start()
    }

    private fun navigateAfterDelay() {
        lifecycleScope.launch {
            delay(SPLASH_DURATION)
            val intent = Intent(this@SplashActivity, MainActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }
    }
}