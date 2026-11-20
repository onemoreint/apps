package com.onemoreint.zappahmanager.core

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DetectionGateTest {
    private val target = "com.ejemplo.zappah"

    @Test
    fun avisaAlAbrirLaAppObjetivo() {
        val g = DetectionGate(target, cooldownMs = 60_000)
        assertTrue(g.onForeground(target, 1_000))
    }

    @Test
    fun noAvisaPorOtrasApps() {
        val g = DetectionGate(target, cooldownMs = 60_000)
        assertFalse(g.onForeground("com.whatsapp", 1_000))
    }

    @Test
    fun noRepiteMientrasSigueEnPrimerPlano() {
        val g = DetectionGate(target, cooldownMs = 0)
        assertTrue(g.onForeground(target, 1_000))
        assertFalse(g.onForeground(target, 2_000)) // otra actividad de la misma app
    }

    @Test
    fun respetaLaEsperaEntreAvisos() {
        val g = DetectionGate(target, cooldownMs = 60_000)
        assertTrue(g.onForeground(target, 0))
        g.onForeground("com.android.launcher", 5_000)
        assertFalse(g.onForeground(target, 10_000))
        g.onForeground("com.android.launcher", 20_000)
        assertTrue(g.onForeground(target, 61_000))
    }
}
