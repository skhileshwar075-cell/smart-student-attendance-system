package com.smartattend

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SmartAttendApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val attendanceChannel = NotificationChannel(
                "attendance_channel",
                "Attendance Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for attendance alerts and reminders"
            }

            val generalChannel = NotificationChannel(
                "smartattend_channel",
                "General Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General app notifications"
            }

            manager.createNotificationChannels(listOf(attendanceChannel, generalChannel))
        }
    }
}
