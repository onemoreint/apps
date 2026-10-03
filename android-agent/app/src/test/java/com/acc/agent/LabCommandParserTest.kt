package com.acc.agent

import com.acc.agent.lab.LabCommand
import com.acc.agent.lab.LabCommandParser
import com.acc.agent.lab.Restrictions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LabCommandParserTest {

    @Test
    fun parsesKnownCommands() {
        assertEquals(LabCommand.Lock, LabCommandParser.parse("lock").getOrThrow())
        assertEquals(LabCommand.Camera(true), LabCommandParser.parse("camera-off").getOrThrow())
        assertEquals(LabCommand.Restriction(Restrictions.BLUETOOTH, false), LabCommandParser.parse("BLUETOOTH_ON").getOrThrow())
    }

    @Test
    fun wipeIsAlwaysRejected() {
        for (c in listOf("wipe", "wipe_device", "factory_reset")) {
            val r = LabCommandParser.parse(c)
            assertTrue(r.isFailure)
            assertEquals(LabCommandParser.WIPE_DISABLED, r.exceptionOrNull()!!.message)
        }
    }

    @Test
    fun unknownOrMissingCommandFails() {
        assertTrue(LabCommandParser.parse(null).isFailure)
        assertTrue(LabCommandParser.parse("format_disk").isFailure)
    }

    @Test
    fun backendUrlMustBeHttpsOrLocal() {
        assertTrue(LabCommandParser.isAllowedBackendUrl("https://acc.example.com"))
        assertTrue(LabCommandParser.isAllowedBackendUrl("http://192.168.1.20:8080"))
        assertTrue(LabCommandParser.isAllowedBackendUrl("http://10.0.2.2:8080/"))
        assertFalse(LabCommandParser.isAllowedBackendUrl("http://example.com"))
        assertFalse(LabCommandParser.isAllowedBackendUrl("ftp://x"))
        assertEquals(LabCommand.SetBackend("https://a.b"), LabCommandParser.parse("set_backend", "https://a.b/").getOrThrow())
    }

    @Test
    fun onlyStatusLikeCommandsSkipDeviceOwner() {
        assertFalse(LabCommand.Status.needsDeviceOwner)
        assertFalse(LabCommand.Help.needsDeviceOwner)
        assertTrue(LabCommand.Lock.needsDeviceOwner)
        assertTrue(LabCommand.Release.needsDeviceOwner)
    }
}
