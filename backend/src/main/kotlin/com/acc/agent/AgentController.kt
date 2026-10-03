package com.acc.agent

import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** Datos que envía Android Control Agent (ver android-agent/.../HeartbeatWorker.kt). */
data class HeartbeatRequest(
    @field:NotBlank @field:Size(max = 64) val manufacturer: String,
    @field:NotBlank @field:Size(max = 64) val model: String,
    @field:NotBlank @field:Size(max = 16) val androidVersion: String,
    @field:Min(21) @field:Max(40) val sdkInt: Int,
    @field:Size(max = 64) val serial: String? = null,
    @field:Min(0) @field:Max(100) val batteryPct: Int? = null,
    @field:Min(0) val storageFreeMb: Long? = null,
    @field:Min(0) val storageTotalMb: Long? = null,
    @field:Min(0) val memoryFreeMb: Long? = null,
    @field:Size(max = 32) val managementMode: String? = null,
    @field:Size(max = 32) val agentVersion: String? = null,
    @field:Size(max = 128) val enrollmentSecret: String? = null,
)

@RestController
@RequestMapping("/api/agent")
class AgentController {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Fase 2: valida y registra el heartbeat. La Fase 6 lo vinculará al Device
     * mediante el device_token del agente y lo guardará en device_heartbeat.
     */
    @PostMapping("/heartbeat")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun heartbeat(@Valid @RequestBody body: HeartbeatRequest): Map<String, String> {
        log.info("heartbeat {} {} Android {} batería={}", body.manufacturer, body.model, body.androidVersion, body.batteryPct)
        return mapOf("status" to "accepted")
    }
}
