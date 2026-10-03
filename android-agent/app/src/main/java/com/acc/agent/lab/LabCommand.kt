package com.acc.agent.lab

/**
 * Comandos que acepta el agente de laboratorio por USB.
 * Esta clase no depende de Android para poder probarla en la JVM.
 */
sealed interface LabCommand {
    data object Status : LabCommand
    data object Lock : LabCommand
    data class Camera(val disabled: Boolean) : LabCommand
    data class ScreenCapture(val disabled: Boolean) : LabCommand
    data class Restriction(val key: String, val enabled: Boolean) : LabCommand
    data object Reboot : LabCommand
    data object Release : LabCommand
    data class SetBackend(val url: String) : LabCommand
    data object Heartbeat : LabCommand
    data object Help : LabCommand

    /** Indica si el comando necesita que el agente sea Device Owner. */
    val needsDeviceOwner: Boolean
        get() = when (this) {
            Status, Help, Heartbeat, is SetBackend -> false
            else -> true
        }
}

object Restrictions {
    // Mismos valores que android.os.UserManager.DISALLOW_*
    const val BLUETOOTH = "no_bluetooth"
    const val USB_FILE_TRANSFER = "no_usb_file_transfer"
    const val INSTALL_UNKNOWN_SOURCES = "no_install_unknown_sources"
    const val INSTALL_UNKNOWN_SOURCES_GLOBALLY = "no_install_unknown_sources_globally"

    /** Restricciones que el agente puede activar y que release() limpia. */
    val MANAGED = listOf(BLUETOOTH, USB_FILE_TRANSFER, INSTALL_UNKNOWN_SOURCES, INSTALL_UNKNOWN_SOURCES_GLOBALLY)
}

object LabCommandParser {

    const val WIPE_DISABLED =
        "El borrado remoto está desactivado en el agente de laboratorio para proteger los datos del teléfono."

    fun parse(cmd: String?, value: String? = null): Result<LabCommand> {
        val name = cmd?.trim()?.lowercase()?.replace('-', '_')
            ?: return Result.failure(IllegalArgumentException("Falta el parámetro cmd. Usa --es cmd help"))
        val command: LabCommand = when (name) {
            "status" -> LabCommand.Status
            "help" -> LabCommand.Help
            "lock" -> LabCommand.Lock
            "camera_off" -> LabCommand.Camera(disabled = true)
            "camera_on" -> LabCommand.Camera(disabled = false)
            "screenshots_off" -> LabCommand.ScreenCapture(disabled = true)
            "screenshots_on" -> LabCommand.ScreenCapture(disabled = false)
            "bluetooth_off" -> LabCommand.Restriction(Restrictions.BLUETOOTH, true)
            "bluetooth_on" -> LabCommand.Restriction(Restrictions.BLUETOOTH, false)
            "usb_files_off" -> LabCommand.Restriction(Restrictions.USB_FILE_TRANSFER, true)
            "usb_files_on" -> LabCommand.Restriction(Restrictions.USB_FILE_TRANSFER, false)
            "install_off" -> LabCommand.Restriction(Restrictions.INSTALL_UNKNOWN_SOURCES, true)
            "install_on" -> LabCommand.Restriction(Restrictions.INSTALL_UNKNOWN_SOURCES, false)
            "reboot" -> LabCommand.Reboot
            "release" -> LabCommand.Release
            "heartbeat" -> LabCommand.Heartbeat
            "set_backend" -> {
                val url = value?.trim().orEmpty()
                if (!isAllowedBackendUrl(url)) {
                    return Result.failure(
                        IllegalArgumentException("URL no válida. Usa https://... (http solo para localhost o red local). Ejemplo: --es value https://acc.midominio.com"),
                    )
                }
                LabCommand.SetBackend(url.trimEnd('/'))
            }
            "wipe", "wipe_device", "factory_reset" -> return Result.failure(UnsupportedOperationException(WIPE_DISABLED))
            else -> return Result.failure(IllegalArgumentException("Comando desconocido: $name. Usa --es cmd help"))
        }
        return Result.success(command)
    }

    fun isAllowedBackendUrl(url: String): Boolean {
        if (url.isEmpty()) return true // vacío = desactivar heartbeat
        if (url.startsWith("https://") && url.length > 8) return true
        val local = Regex("^http://(localhost|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+|172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+)(:\\d+)?(/.*)?$")
        return local.matches(url)
    }

    val HELP = """
        Comandos (adb shell am broadcast -a com.acc.agent.COMMAND -n com.acc.agent/.lab.AdbCommandReceiver --es cmd <comando>):
        status, lock, camera_off, camera_on, screenshots_off, screenshots_on,
        bluetooth_off, bluetooth_on, usb_files_off, usb_files_on, install_off, install_on,
        reboot, release, heartbeat, set_backend (--es value https://...)
    """.trimIndent()
}
