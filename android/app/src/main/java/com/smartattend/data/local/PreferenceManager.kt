package com.smartattend.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore by preferencesDataStore(name = "smartattend_prefs")

@Singleton
class PreferenceManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val USER_ID = stringPreferencesKey("user_id")
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_ROLE = stringPreferencesKey("user_role")
        val PROFILE_ID = stringPreferencesKey("profile_id")
        val CLASS_ID = stringPreferencesKey("class_id")
    }

    val authToken: Flow<String?> = context.dataStore.data.map { it[AUTH_TOKEN] }
    val userId: Flow<String?> = context.dataStore.data.map { it[USER_ID] }
    val userName: Flow<String?> = context.dataStore.data.map { it[USER_NAME] }
    val userEmail: Flow<String?> = context.dataStore.data.map { it[USER_EMAIL] }
    val userRole: Flow<String?> = context.dataStore.data.map { it[USER_ROLE] }

    suspend fun saveSession(token: String, userId: String, name: String, email: String, role: String, profileId: String?, classId: String?) {
        context.dataStore.edit { prefs ->
            prefs[AUTH_TOKEN] = token
            prefs[USER_ID] = userId
            prefs[USER_NAME] = name
            prefs[USER_EMAIL] = email
            prefs[USER_ROLE] = role
            if (profileId != null) prefs[PROFILE_ID] = profileId
            if (classId != null) prefs[CLASS_ID] = classId
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }
}
