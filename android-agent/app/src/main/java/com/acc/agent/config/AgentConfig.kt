package com.acc.agent.config

import android.content.Context
import android.content.RestrictionsManager
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.WorkManager
import com.acc.agent.work.HeartbeatWorker

/**
 * Configuración del agente. Prioridad:
 * 1. Managed Configuration (la entrega el DPC o AMAPI vía RestrictionsManager).
 * 2. Valor local fijado por USB con el comando set_backend (modo laboratorio).
 */
object AgentConfig {
    private const val PREFS = "acc_agent"
    private const val KEY_BACKEND = "backend_url"

    private fun restrictions(context: Context) =
        context.getSystemService(RestrictionsManager::class.java)?.applicationRestrictions

    fun backendUrl(context: Context): String {
        val managed = restrictions(context)?.getString(KEY_BACKEND).orEmpty()
        if (managed.isNotBlank()) return managed.trimEnd('/')
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_BACKEND, "").orEmpty()
    }

    fun enrollmentSecret(context: Context): String =
        restrictions(context)?.getString("enrollment_secret").orEmpty()

    fun heartbeatMinutes(context: Context): Long {
        val v = restrictions(context)?.getInt("heartbeat_minutes", 15) ?: 15
        return v.coerceAtLeast(15).toLong() // WorkManager no permite menos de 15 min
    }

    fun setLocalBackendUrl(context: Context, url: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_BACKEND, url).apply()
    }

    fun agentVersion(context: Context): String =
        runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "?"

    /** Programa (o cancela) el heartbeat periódico según haya backend configurado. */
    fun schedule(context: Context) {
        val wm = WorkManager.getInstance(context)
        if (backendUrl(context).isEmpty()) {
            wm.cancelUniqueWork(HeartbeatWorker.UNIQUE)
            return
        }
        wm.enqueueUniquePeriodicWork(
            HeartbeatWorker.UNIQUE,
            ExistingPeriodicWorkPolicy.UPDATE,
            HeartbeatWorker.periodic(heartbeatMinutes(context)),
        )
    }
}
