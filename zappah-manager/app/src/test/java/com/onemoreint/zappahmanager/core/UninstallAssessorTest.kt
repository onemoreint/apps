package com.onemoreint.zappahmanager.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UninstallAssessorTest {

    private val libre = AppFacts(
        isSystemApp = false,
        isUpdatedSystemApp = false,
        isActiveDeviceAdmin = false,
        uninstallBlockedByPolicy = false,
        restrictionUninstallApps = false,
        restrictionAppsControl = false,
    )

    @Test
    fun appNormalSePuedeSolicitar() {
        val a = UninstallAssessor.assess(libre)
        assertTrue(a.canRequestUninstall)
        assertTrue(a.findings.none { it.severity == Severity.BLOQUEO })
    }

    @Test
    fun administradorActivoBloquea() {
        val a = UninstallAssessor.assess(libre.copy(isActiveDeviceAdmin = true))
        assertFalse(a.canRequestUninstall)
        assertTrue(a.authorizedOptions.any { it.contains("Administradores de dispositivo") })
    }

    @Test
    fun bloqueoPorPoliticaBloquea() {
        assertFalse(UninstallAssessor.assess(libre.copy(uninstallBlockedByPolicy = true)).canRequestUninstall)
        assertFalse(UninstallAssessor.assess(libre.copy(restrictionUninstallApps = true)).canRequestUninstall)
    }

    @Test
    fun appDeSistemaNoSeDesinstala() {
        val a = UninstallAssessor.assess(libre.copy(isSystemApp = true))
        assertFalse(a.canRequestUninstall)
    }

    @Test
    fun appDeSistemaActualizadaSoloQuitaActualizaciones() {
        val a = UninstallAssessor.assess(libre.copy(isSystemApp = true, isUpdatedSystemApp = true))
        assertTrue(a.canRequestUninstall)
        assertEquals("Solo se pueden quitar sus actualizaciones.", a.summary)
    }

    @Test
    fun datoNoDisponibleSeInforma() {
        val a = UninstallAssessor.assess(libre.copy(uninstallBlockedByPolicy = null))
        assertTrue(a.findings.any { it.title.contains("no disponible") })
    }

    @Test
    fun siempreOfreceLaPantallaOficial() {
        val a = UninstallAssessor.assess(libre.copy(isActiveDeviceAdmin = true, uninstallBlockedByPolicy = true))
        assertTrue(a.authorizedOptions.any { it.contains("información de la app") })
    }
}
