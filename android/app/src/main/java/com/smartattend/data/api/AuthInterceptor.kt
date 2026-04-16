package com.smartattend.data.api

import com.smartattend.data.local.PreferenceManager
import com.smartattend.util.LogoutEventBus
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val preferenceManager: PreferenceManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { preferenceManager.authToken.first() }
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        val response = chain.proceed(request)
        if (response.code == 401) {
            runBlocking { preferenceManager.clearSession() }
            LogoutEventBus.postLogout()
        }
        return response
    }
}
