package com.acc.agent.lab

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.acc.agent.config.AgentConfig
import com.acc.agent.work.HeartbeatWorker

/**
 * Acciones de administración usando solo DevicePolicyManager (API oficial).
 * Todas exigen que el agente sea Device Owner, salvo status/help/heartbeat.
 * No existe ninguna acción de borrado: está excluida a propósito.
 */
class DpcActions(private val context: Context) {

    private val dpm = context.getSystemService(DevicePolicyManager::class.java)
    private val admin = AccDeviceAdminReceiver.component(context)

    fun isDeviceOwner(): Boolean = dpm.isDeviceOwnerApp(context.packageName)

    fun execute(command: LabCommand): String {
        if (command.needsDeviceOwner && !isDeviceOwner()) {
            return "ERROR: el agente no es Device Owner. Ejecuta: adb shell dpm set-device-owner $COMPONENT"
        }
        val result = try {
            when (command) {
                LabCommand.Status -> status()
                LabCommand.Help -> LabCommandParser.HELP
                LabCommand.Lock -> {
                    dpm.lockNow()
                    "OK: pantalla bloqueada"
                }
                is LabCommand.Camera -> {
                    dpm.setCameraDisabled(admin, command.disabled)
                    if (command.disabled) "OK: cámara desactivada" else "OK: cámara activada"
                }
                is LabCommand.ScreenCapture -> {
                    dpm.setScreenCaptureDisabled(admin, command.disabled)
                    if (command.disabled) "OK: capturas de pantalla bloqueadas" else "OK: capturas de pantalla permitidas"
                }
                is LabCommand.Restriction -> setRestriction(command.key, command.enabled)
                LabCommand.Reboot -> "OK: reiniciando" // el reinicio real lo dispara AdbCommandReceiver tras responder
                LabCommand.Release -> release()
                is LabCommand.SetBackend -> {
                    AgentConfig.setLocalBackendUrl(context, command.url)
                    AgentConfig.schedule(context)
                    if (command.url.isEmpty()) "OK: heartbeat desactivado" else "OK: backend = ${command.url}"
                }
                LabCommand.Heartbeat -> {
                    HeartbeatWorker.runOnce(context)
                    "OK: heartbeat en cola"
                }
            }
        } catch (e: SecurityException) {
            "ERROR: Android rechazó la operación (${e.message}). Esta operación requiere un modo de administración compatible o no está permitida por Android."
        } catch (e: Exception) {
            "ERROR: ${e.javaClass.simpleName}: ${e.message}"
        }
        Log.i(AccDeviceAdminReceiver.TAG, "comando=$command resultado=$result")
        return result
    }

    fun reboot() {
        dpm.reboot(admin)
    }

    private fun setRestriction(key: String, enabled: Boolean): String {
        val keys = if (key == Restrictions.INSTALL_UNKNOWN_SOURCES && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            listOf(key, Restrictions.INSTALL_UNKNOWN_SOURCES_GLOBALLY)
        } else {
            listOf(key)
        }
        keys.forEach { if (enabled) dpm.addUserRestriction(admin, it) else dpm.clearUserRestriction(admin, it) }
        return "OK: ${keys.joinToString()} ${if (enabled) "activada" else "quitada"}"
    }

    @Suppress("DEPRECATION")
    private fun release(): String {
        dpm.setCameraDisabled(admin, false)
        dpm.setScreenCaptureDisabled(admin, false)
        Restrictions.MANAGED.forEach { runCatching { dpm.clearUserRestriction(admin, it) } }
        dpm.clearDeviceOwnerApp(context.packageName)
        runCatching { dpm.removeActiveAdmin(admin) }
        return "OK: restricciones quitadas y administración liberada. Ya puedes desinstalar: adb uninstall com.acc.agent"
    }

    fun status(): String {
        val owner = isDeviceOwner()
        val lines = mutableListOf(
            "device_owner=$owner",
            "android=${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})",
            "equipo=${Build.MANUFACTURER} ${Build.MODEL}",
            "camara_desactivada=${dpm.getCameraDisabled(null)}",
        )
        if (owner) {
            lines += "capturas_bloqueadas=${dpm.getScreenCaptureDisabled(admin)}"
            val active = dpm.getUserRestrictions(admin).keySet().filter { k -> dpm.getUserRestrictions(admin).getBoolean(k) }
            lines += "restricciones=${if (active.isEmpty()) "ninguna" else active.joinToString(",")}"
        }
        lines += "backend=${AgentConfig.backendUrl(context).ifEmpty { "sin configurar" }}"
        lines += "agente=${AgentConfig.agentVersion(context)}"
        return lines.joinToString(" | ")
    }

    companion object {
        const val COMPONENT = "com.acc.agent/.lab.AccDeviceAdminReceiver"
    }
}
