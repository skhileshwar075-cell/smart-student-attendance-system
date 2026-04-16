package com.smartattend.ui

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.smartattend.R
import com.smartattend.databinding.ActivityMainBinding
import com.smartattend.ui.auth.LoginActivity
import com.smartattend.util.LogoutEventBus
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)

        lifecycleScope.launch {
            LogoutEventBus.logoutEvent.collect {
                startActivity(Intent(this@MainActivity, HomeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
                finish()
            }
        }

        lifecycleScope.launch {
            if (!viewModel.isLoggedIn()) {
                startActivity(Intent(this@MainActivity, HomeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
                finish()
                return@launch
            }

            val name = viewModel.getUserName()
            val initial = name?.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
            binding.tvUserInitial.text = initial

            val role = viewModel.getUserRole()
            setupNavigation(role)
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_main_overflow, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_logout -> {
                lifecycleScope.launch {
                    viewModel.logout()
                    startActivity(Intent(this@MainActivity, HomeActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    finish()
                }
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun setupNavigation(role: String?) {
        val navHostFragment = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        val graphResId = when (role) {
            "admin" -> R.navigation.nav_admin
            "teacher" -> R.navigation.nav_teacher
            else -> R.navigation.nav_student
        }

        val graph = navController.navInflater.inflate(graphResId)
        navController.graph = graph

        val bottomNav = binding.bottomNavigation
        bottomNav.setupWithNavController(navController)

        val menuResId = when (role) {
            "admin" -> R.menu.menu_admin
            "teacher" -> R.menu.menu_teacher
            else -> R.menu.menu_student
        }
        bottomNav.menu.clear()
        bottomNav.inflateMenu(menuResId)

        val topLevelIds = bottomNav.menu.let { m ->
            (0 until m.size()).map { m.getItem(it).itemId }.toSet()
        }
        val appBarConfig = AppBarConfiguration(topLevelIds)
        setupActionBarWithNavController(navController, appBarConfig)
    }
}
