package com.acc.capabilities

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class CapabilityEngineTest {

    @Test
    fun `una app normal no puede ejecutar comandos de control`() {
        listOf(CommandType.LOCK_DEVICE, CommandType.REBOOT_DEVICE, CommandType.WIPE_DEVICE).forEach {
            assertEquals(CapabilityEngine.NOT_ALLOWED_MESSAGE, CapabilityEngine.commandBlockReason(it, ManagementMode.NORMAL_APP, 34))
        }
    }

    @Test
    fun `fully managed permite bloqueo reinicio y borrado`() {
        listOf(CommandType.LOCK_DEVICE, CommandType.REBOOT_DEVICE, CommandType.WIPE_DEVICE).forEach {
            assertNull(CapabilityEngine.commandBlockReason(it, ManagementMode.FULLY_MANAGED, 34))
        }
    }

    @Test
    fun `el laboratorio nunca permite borrado`() {
        assertNotNull(CapabilityEngine.commandBlockReason(CommandType.WIPE_DEVICE, ManagementMode.LAB_DEVICE_OWNER, 35))
        assertNull(CapabilityEngine.commandBlockReason(CommandType.LOCK_DEVICE, ManagementMode.LAB_DEVICE_OWNER, 35))
    }

    @Test
    fun `device admin pierde la camara desde Android 10`() {
        assertEquals(CapabilityStatus.UNSUPPORTED, CapabilityEngine.statusOf(ManagementMode.DEVICE_ADMIN, 29, Capability.CAMERA))
        assertEquals(CapabilityStatus.PARTIAL, CapabilityEngine.statusOf(ManagementMode.DEVICE_ADMIN, 28, Capability.CAMERA))
    }

    @Test
    fun `cada modo declara todas las capacidades`() {
        ManagementMode.entries.forEach { assertEquals(Capability.entries.size, CapabilityEngine.capabilitiesFor(it, 34).size) }
    }
}
