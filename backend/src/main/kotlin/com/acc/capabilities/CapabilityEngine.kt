package com.acc.capabilities

/**
 * Motor de capacidades. Misma tabla que web/src/lib/capabilities.ts y
 * docs/capability-matrix.md. Decide qué comandos y políticas se pueden
 * aplicar a un dispositivo según su modo de administración y su versión.
 */
enum class ManagementMode { NORMAL_APP, DEVICE_ADMIN, WORK_PROFILE, FULLY_MANAGED, DEDICATED, LAB_DEVICE_OWNER }

enum class CapabilityStatus { SUPPORTED, PARTIAL, UNSUPPORTED }

enum class Capability {
    DEVICE_INFO, HARDWARE_IDS, MANAGED_CONFIG, APP_MANAGEMENT, SILENT_INSTALL, PASSWORD_POLICY,
    REMOTE_LOCK, CAMERA, SCREEN_CAPTURE, USB, WIFI, BLUETOOTH, USER_RESTRICTIONS,
    SYSTEM_UPDATES, REBOOT, WIPE, KIOSK,
}

enum class CommandType(val capability: Capability) {
    GET_DEVICE_INFO(Capability.DEVICE_INFO),
    SYNC_NOW(Capability.DEVICE_INFO),
    SYNC_POLICY(Capability.USER_RESTRICTIONS),
    SYNC_APPLICATIONS(Capability.APP_MANAGEMENT),
    REFRESH_CONFIGURATION(Capability.MANAGED_CONFIG),
    LOCK_DEVICE(Capability.REMOTE_LOCK),
    REBOOT_DEVICE(Capability.REBOOT),
    WIPE_DEVICE(Capability.WIPE),
}

data class CapabilityResult(val capability: Capability, val status: CapabilityStatus)

object CapabilityEngine {
    const val NOT_ALLOWED_MESSAGE =
        "Esta operación requiere un modo de administración compatible o no está permitida por Android."

    private val S = CapabilityStatus.SUPPORTED
    private val P = CapabilityStatus.PARTIAL
    private val U = CapabilityStatus.UNSUPPORTED

    // Orden de columnas: NORMAL_APP, DEVICE_ADMIN, WORK_PROFILE, FULLY_MANAGED, DEDICATED, LAB_DEVICE_OWNER
    private fun row(sdk: Int, c: Capability): List<CapabilityStatus> {
        val daDeprecated = if (sdk >= 29) U else P
        val usbFull = if (sdk >= 31) S else P
        return when (c) {
            Capability.DEVICE_INFO -> listOf(S, S, S, S, S, S)
            Capability.HARDWARE_IDS -> listOf(U, U, U, S, S, S)
            Capability.MANAGED_CONFIG -> listOf(U, U, S, S, S, S)
            Capability.APP_MANAGEMENT -> listOf(U, U, S, S, S, S)
            Capability.SILENT_INSTALL -> listOf(U, U, S, S, S, P)
            Capability.PASSWORD_POLICY -> listOf(U, daDeprecated, S, S, S, S)
            Capability.REMOTE_LOCK -> listOf(U, S, P, S, S, S)
            Capability.CAMERA -> listOf(U, daDeprecated, P, S, S, S)
            Capability.SCREEN_CAPTURE -> listOf(U, U, P, S, S, S)
            Capability.USB -> listOf(U, U, U, usbFull, usbFull, P)
            Capability.WIFI -> listOf(P, U, P, S, S, P)
            Capability.BLUETOOTH -> listOf(U, U, P, S, S, S)
            Capability.USER_RESTRICTIONS -> listOf(U, U, P, S, S, S)
            Capability.SYSTEM_UPDATES -> listOf(U, U, U, S, S, P)
            Capability.REBOOT -> listOf(U, U, U, S, S, S)
            Capability.WIPE -> listOf(U, P, P, S, S, U) // laboratorio: borrado desactivado a propósito
            Capability.KIOSK -> listOf(U, U, U, P, S, S)
        }
    }

    fun statusOf(mode: ManagementMode, sdk: Int, capability: Capability): CapabilityStatus =
        row(sdk, capability)[mode.ordinal]

    fun capabilitiesFor(mode: ManagementMode, sdk: Int): List<CapabilityResult> =
        Capability.entries.map { CapabilityResult(it, statusOf(mode, sdk, it)) }

    /** null si el comando está permitido; si no, el mensaje que verá el administrador. */
    fun commandBlockReason(type: CommandType, mode: ManagementMode, sdk: Int): String? =
        if (statusOf(mode, sdk, type.capability) == CapabilityStatus.UNSUPPORTED) NOT_ALLOWED_MESSAGE else null
}
