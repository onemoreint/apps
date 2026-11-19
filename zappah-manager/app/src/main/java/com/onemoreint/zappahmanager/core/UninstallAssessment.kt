package com.onemoreint.zappahmanager.core

/**
 * Hechos sobre la app objetivo que Android SÍ permite consultar a una app normal (sin root).
 * Un valor null significa "Android no permite consultarlo o la consulta falló".
 */
data class AppFacts(
    val isSystemApp: Boolean,
    val isUpdatedSystemApp: Boolean,
    val isActiveDeviceAdmin: Boolean,
    val uninstallBlockedByPolicy: Boolean?,
    val restrictionUninstallApps: Boolean,
    val restrictionAppsControl: Boolean,
)

enum class Severity { BLOQUEO, AVISO, INFO }

data class Finding(val severity: Severity, val title: String, val detail: String)

data class Assessment(
    /** true si tiene sentido abrir el diálogo oficial ACTION_DELETE. */
    val canRequestUninstall: Boolean,
    val summary: String,
    val findings: List<Finding>,
    val authorizedOptions: List<String>,
)

/**
 * Evalúa, solo con datos públicos, si Android dejará desinstalar la app.
 * No intenta saltarse ninguna restricción: solo explica la causa y las vías oficiales.
 */
object UninstallAssessor {

    fun assess(f: AppFacts): Assessment {
        val findings = mutableListOf<Finding>()
        val options = linkedSetOf<String>()
        var hardBlock = false

        if (f.restrictionUninstallApps) {
            hardBlock = true
            findings += Finding(
                Severity.BLOQUEO,
                "Política del dispositivo: desinstalar apps está prohibido",
                "Un administrador (Device Owner, Profile Owner o MDM) activó la restricción " +
                    "DISALLOW_UNINSTALL_APPS. Android no deja desinstalar ninguna app mientras siga activa."
            )
            options += "Contactar a quien administra el dispositivo (empresa, financiera u operador) para que retire la política."
        }

        if (f.uninstallBlockedByPolicy == true) {
            hardBlock = true
            findings += Finding(
                Severity.BLOQUEO,
                "Desinstalación bloqueada por un administrador",
                "Android confirma que una política de administración bloqueó la desinstalación de esta app " +
                    "(setUninstallBlocked). Solo ese administrador puede levantar el bloqueo."
            )
            options += "Contactar a quien administra el dispositivo (empresa, financiera u operador) para que retire la política."
        }

        if (f.isActiveDeviceAdmin) {
            hardBlock = true
            findings += Finding(
                Severity.BLOQUEO,
                "La app es administrador de dispositivo activo",
                "Android exige desactivar su permiso de administrador antes de desinstalarla. " +
                    "Si el interruptor aparece gris, la app es Device Owner o una política lo protege, " +
                    "y no se puede desactivar desde el teléfono."
            )
            options += "Ir a Ajustes > Seguridad > Más ajustes > Administradores de dispositivo e intentar desactivarla."
        }

        if (f.isSystemApp && !f.isUpdatedSystemApp) {
            hardBlock = true
            findings += Finding(
                Severity.BLOQUEO,
                "App de sistema",
                "Viene instalada en la partición del sistema. Sin root no se puede desinstalar; " +
                    "como máximo se puede deshabilitar si el fabricante habilita ese botón."
            )
            options += "Abrir la información de la app y usar Deshabilitar si está disponible."
        } else if (f.isSystemApp && f.isUpdatedSystemApp) {
            findings += Finding(
                Severity.AVISO,
                "App de sistema actualizada",
                "Android solo permite desinstalar sus actualizaciones y volver a la versión de fábrica."
            )
            options += "Solicitar la desinstalación: Android ofrecerá quitar las actualizaciones."
        }

        if (f.restrictionAppsControl) {
            findings += Finding(
                Severity.AVISO,
                "Control de apps restringido",
                "La política DISALLOW_APPS_CONTROL impide deshabilitar apps, borrar sus datos o forzar su detención."
            )
        }

        if (f.uninstallBlockedByPolicy == null) {
            findings += Finding(
                Severity.INFO,
                "Bloqueo por política: no disponible",
                "Android no respondió a la consulta isUninstallBlocked en este dispositivo."
            )
        }

        if (!hardBlock && findings.none { it.severity == Severity.AVISO }) {
            findings += Finding(
                Severity.INFO,
                "Sin restricciones detectadas",
                "Con los datos que Android permite consultar, no hay nada que impida pedir la desinstalación. " +
                    "Android mostrará su propio diálogo de confirmación."
            )
        }

        options += "Abrir la información de la app en Ajustes (pantalla oficial de Android)."
        options += "Revisar sus permisos desde la información de la app."

        val summary = when {
            hardBlock -> "Android impide desinstalarla en este momento."
            f.isSystemApp -> "Solo se pueden quitar sus actualizaciones."
            else -> "Android permite solicitar la desinstalación."
        }

        return Assessment(
            canRequestUninstall = !hardBlock,
            summary = summary,
            findings = findings,
            authorizedOptions = options.toList(),
        )
    }
}
