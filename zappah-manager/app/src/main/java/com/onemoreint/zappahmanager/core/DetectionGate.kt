package com.onemoreint.zappahmanager.core

/**
 * Decide si hay que notificar cuando cambia la app en primer plano.
 *
 * - Notifica solo en la transición "otra app -> app objetivo".
 * - Mientras la app objetivo siga en primer plano no repite.
 * - Tras notificar, respeta un tiempo de espera (cooldown) para evitar duplicados
 *   si el usuario entra y sale varias veces seguidas.
 */
class DetectionGate(
    private val targetPackage: String,
    private val cooldownMs: Long,
) {
    private var targetInForeground = false
    private var lastNotifiedAt: Long? = null

    /** Llamar con cada paquete que pasa a primer plano. Devuelve true si hay que notificar. */
    fun onForeground(packageName: String, timestampMs: Long): Boolean {
        if (packageName != targetPackage) {
            targetInForeground = false
            return false
        }
        if (targetInForeground) return false
        targetInForeground = true

        val last = lastNotifiedAt
        if (last != null && timestampMs - last < cooldownMs) return false

        lastNotifiedAt = timestampMs
        return true
    }
}
