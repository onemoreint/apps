package com.onemoreint.zappahmanager.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.SystemAccess
import com.onemoreint.zappahmanager.core.UninstallAssessor
import com.onemoreint.zappahmanager.ui.DataOrigin
import com.onemoreint.zappahmanager.ui.InfoRow
import com.onemoreint.zappahmanager.ui.Pill
import com.onemoreint.zappahmanager.ui.ScreenColumn
import com.onemoreint.zappahmanager.ui.SectionCard
import com.onemoreint.zappahmanager.ui.UiState
import com.onemoreint.zappahmanager.ui.severityColor
import com.onemoreint.zappahmanager.ui.severityLabel
import java.text.DateFormat
import java.util.Date

@Composable
fun DiagnosisScreen(state: UiState, onChooseApp: () -> Unit) {
    val context = LocalContext.current
    val d = state.diagnosis

    ScreenColumn("Diagnóstico", "Solo datos que Android permite consultar a una app normal, sin root.") {
        if (d == null) {
            SectionCard {
                Text("Todavía no hay una app elegida.")
                FilledTonalButton(onClick = onChooseApp) { Text("Elegir app") }
            }
            return@ScreenColumn
        }

        val fmt = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
        val a = UninstallAssessor.assess(d.facts)

        SectionCard("Aplicación") {
            InfoRow("Nombre", d.label)
            InfoRow("Paquete", d.packageName)
            InfoRow("Versión", "${d.versionName ?: "—"} (código ${d.versionCode})")
            InfoRow("Habilitada", if (d.enabled) "Sí" else "No")
            InfoRow("Estado configurado", d.enabledSettingLabel)
            InfoRow(
                "Tipo",
                when {
                    d.facts.isSystemApp && d.facts.isUpdatedSystemApp -> "App de sistema (actualizada)"
                    d.facts.isSystemApp -> "App de sistema"
                    else -> "App instalada por el usuario o por otra app"
                },
            )
            InfoRow(
                "Instalada desde",
                d.installer ?: "Sin dato",
                if (d.installer == null) DataOrigin.NO_DISPONIBLE else DataOrigin.CONFIRMADO,
            )
            InfoRow("Instalada el", fmt.format(Date(d.firstInstallTime)))
            InfoRow("Última actualización", fmt.format(Date(d.lastUpdateTime)))
            InfoRow("Target SDK", d.targetSdk.toString())
        }

        SectionCard("¿Se puede desinstalar?") {
            Pill(a.summary, if (a.canRequestUninstall) com.onemoreint.zappahmanager.ui.theme.Ok else com.onemoreint.zappahmanager.ui.theme.Bad)
            InfoRow("Android permite iniciar la solicitud", if (a.canRequestUninstall) "Sí" else "No")
            a.findings.forEach { f ->
                Row(verticalAlignment = Alignment.Top) {
                    Pill(severityLabel(f.severity), severityColor(f.severity))
                    Spacer(Modifier.size(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(f.title, style = MaterialTheme.typography.bodyMedium)
                        Text(f.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        SectionCard("Restricciones administrativas") {
            InfoRow("Administrador de dispositivo activo", if (d.facts.isActiveDeviceAdmin) "Sí" else "No")
            d.activeAdminComponents.forEach {
                Text("• $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            InfoRow(
                "Desinstalación bloqueada por política",
                when (d.facts.uninstallBlockedByPolicy) {
                    true -> "Sí"
                    false -> "No"
                    null -> "Sin respuesta del sistema"
                },
                if (d.facts.uninstallBlockedByPolicy == null) DataOrigin.NO_DISPONIBLE else DataOrigin.CONFIRMADO,
            )
            InfoRow("Restricción DISALLOW_UNINSTALL_APPS", if (d.facts.restrictionUninstallApps) "Activa" else "No activa")
            InfoRow("Restricción DISALLOW_APPS_CONTROL", if (d.facts.restrictionAppsControl) "Activa" else "No activa")
            InfoRow("¿Es Device Owner?", "Android no lo revela a otras apps", DataOrigin.NO_DISPONIBLE)
            InfoRow("Quién aplicó la política", "Android no lo revela a otras apps", DataOrigin.NO_DISPONIBLE)
            InfoRow("Bloqueos propios de MagicOS", "No hay API pública para consultarlos", DataOrigin.NO_DISPONIBLE)
        }

        SectionCard("Opciones autorizadas") {
            a.authorizedOptions.forEach {
                Text("• $it", style = MaterialTheme.typography.bodyMedium)
            }
            Button(onClick = { SystemAccess.openAppDetails(context, d.packageName) }, modifier = Modifier.fillMaxWidth()) {
                Text("Abrir información de la app")
            }
            if (d.facts.isActiveDeviceAdmin) {
                OutlinedButton(onClick = { SystemAccess.openSecuritySettings(context) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Abrir Seguridad (administradores)")
                }
            }
            OutlinedButton(
                onClick = { SystemAccess.requestUninstall(context, d.packageName) },
                enabled = a.canRequestUninstall,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (a.canRequestUninstall) "Solicitar desinstalación" else "Desinstalación no disponible")
            }
        }
    }
}
