package com.acc.agent.config

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Se dispara cuando el administrador cambia la Managed Configuration del agente. */
class RestrictionsChangedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.i("ACC", "Configuración administrada actualizada")
        AgentConfig.schedule(context)
    }
}
