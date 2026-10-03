package com.acc.capabilities

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/capabilities")
class CapabilityController {

    /** Matriz completa para una versión de Android (SDK). Pública: es documentación. */
    @GetMapping("/matrix")
    fun matrix(@RequestParam(defaultValue = "34") sdk: Int): Map<ManagementMode, List<CapabilityResult>> {
        require(sdk in 21..40) { "sdk fuera de rango" }
        return ManagementMode.entries.associateWith { CapabilityEngine.capabilitiesFor(it, sdk) }
    }
}
