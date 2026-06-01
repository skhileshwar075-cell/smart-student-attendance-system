package com.fanind09.smartattendance

import android.app.Application
import android.os.Build
import android.webkit.WebView

class SmartAttendanceApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val processName = getProcessName()
            if (packageName != processName) {
                WebView.setDataDirectorySuffix(processName)
            }
        }
    }
}
