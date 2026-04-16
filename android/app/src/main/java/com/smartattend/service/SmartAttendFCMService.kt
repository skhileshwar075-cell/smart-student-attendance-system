package com.smartattend.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.smartattend.R
import com.smartattend.data.repository.AuthRepository
import com.smartattend.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SmartAttendFCMService : FirebaseMessagingService() {

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                authRepository.updateFcmToken(token)
            } catch (e: Exception) {
                Log.w("FCM", "Failed to update FCM token on server: ${e.message}")
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        try {
            val title = message.notification?.title ?: message.data["title"] ?: "SmartAttend"
            val body = message.notification?.body ?: message.data["message"] ?: ""
            val type = message.data["type"] ?: "info"
            showNotification(title, body, type)
        } catch (e: Exception) {
            Log.e("FCM", "Failed to handle message: ${e.message}")
        }
    }

    private fun showNotification(title: String, body: String, type: String) {
        val channelId = if (type == "warning" || type == "alert") "attendance_channel" else "smartattend_channel"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
