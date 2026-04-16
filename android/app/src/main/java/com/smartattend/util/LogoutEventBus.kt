package com.smartattend.util

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object LogoutEventBus {
    private val _logoutEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val logoutEvent: SharedFlow<Unit> = _logoutEvent.asSharedFlow()

    fun postLogout() {
        _logoutEvent.tryEmit(Unit)
    }
}
