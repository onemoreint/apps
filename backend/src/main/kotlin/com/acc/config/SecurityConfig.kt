package com.acc.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/**
 * Fase 1-2: API sin sesión (stateless). Solo salud, documentación, matriz de
 * capacidades y heartbeat del agente son públicos; el resto devuelve 401
 * hasta que la Fase 4 añada JWT + refresh tokens + RBAC.
 */
@Configuration
class SecurityConfig(
    @Value("\${acc.cors.allowed-origins}") private val allowedOrigins: List<String>,
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() } // API con Bearer; el endpoint de refresh (cookie) tendrá CSRF propio en Fase 4
            .cors { }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .headers { h ->
                h.contentSecurityPolicy { it.policyDirectives("default-src 'none'; frame-ancestors 'none'") }
                h.httpStrictTransportSecurity { it.includeSubDomains(true).maxAgeInSeconds(31_536_000) }
            }
            .authorizeHttpRequests {
                it.requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                it.requestMatchers(HttpMethod.GET, "/api/capabilities/**").permitAll()
                it.requestMatchers(HttpMethod.POST, "/api/agent/heartbeat").permitAll()
                it.anyRequest().authenticated()
            }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val cfg = CorsConfiguration().apply {
            allowedOrigins = this@SecurityConfig.allowedOrigins
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE")
            allowedHeaders = listOf("Authorization", "Content-Type", "X-CSRF-Token")
            allowCredentials = true
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/api/**", cfg) }
    }
}
