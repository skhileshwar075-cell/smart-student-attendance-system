package com.smartattend.util

import com.smartattend.data.local.PreferenceManager
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val preferenceManager: PreferenceManager
) {
    suspend fun getToken(): String? = preferenceManager.authToken.first()

    suspend fun getUserRole(): String? = preferenceManager.userRole.first()

    suspend fun isLoggedIn(): Boolean = !getToken().isNullOrBlank()
}
