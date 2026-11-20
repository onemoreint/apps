package com.onemoreint.zappahmanager.ui.screens

import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.SystemAccess
import com.onemoreint.zappahmanager.core.UninstallAssessor
import com.onemoreint.zappahmanager.ui.Pill
import com.onemoreint.zappahmanager.ui.ScreenColumn
import com.onemoreint.zappahmanager.ui.SectionCard
import com.onemoreint.zappahmanager.ui.StatusLine
import com.onemoreint.zappahmanager.ui.Tab
import com.onemoreint.zappahmanager.ui.UiState
import com.onemoreint.zappahmanager.ui.theme.Bad
import com.onemoreint.zappahmanager.ui.theme.Ok
import com.onemoreint.zappahmanager.ui.theme.Warn

@Composable
fun HomeScreen(state: UiState, onGo: (Tab) -> Unit, onOpenOptions: () -> Unit) {
    val context = LocalContext.current
    val d = state.diagnosis

    ScreenColumn("Zappah Manager", "Revisa y administra Zappah con las herramientas oficiales de Android.") {

        SectionCard("App vigilada") {
            when {
                d != null -> {
                    Text(d.label, style = MaterialTheme.typography.titleMedium)
                    Text(d.packageName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    val a = UninstallAssessor.assess(d.facts)
                    Pill(a.summary, if (a.canRequestUninstall) Ok else Bad)
                }
                state.candidates == null -> Text("Buscando Zappah entre las apps instaladas…")
                state.candidates.isEmpty() -> {
                    Text("No se encontró ninguna app con “Zappah” en su nombre o paquete.")
                    Text(
                        "Puede tener otro nombre visible. Elígela a mano en Monitor.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    FilledTonalButton(onClick = { onGo(Tab.MONITOR) }) { Text("Elegir app") }
                }
                else -> {
                    Text("Hay ${state.candidates.size} apps que coinciden. Elige cuál es Zappah.")
                    FilledTonalButton(onClick = { onGo(Tab.MONITOR) }) { Text("Elegir app") }
                }
            }
        }

        SectionCard("Estado") {
            StatusLine(
                if (state.monitorRunning) "Monitor encendido" else "Monitor apagado",
                state.monitorRunning,
                if (state.monitorRunning) "Recibirás un aviso cuando se abra." else "Actívalo en la pestaña Monitor.",
            )
            StatusLine("Acceso a datos de uso", SystemAccess.hasUsageAccess(context))
            StatusLine("Notificaciones", SystemAccess.hasNotificationPermission(context))
        }

        if (state.target != null) {
            SectionCard("Acciones rápidas") {
                Button(onClick = onOpenOptions, modifier = Modifier.fillMaxWidth()) { Text("Opciones de administración") }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = { SystemAccess.openAppDetails(context, state.target) }, modifier = Modifier.weight(1f)) {
                        Text("Información")
                    }
                    OutlinedButton(onClick = { onGo(Tab.DIAGNOSTICO) }, modifier = Modifier.weight(1f)) {
                        Text("Diagnóstico")
                    }
                }
            }
        }

        SectionCard("Este teléfono") {
            Text(
                "${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                "Dato leído del sistema, no supuesto.",
                style = MaterialTheme.typography.bodySmall,
                color = Warn.copy(alpha = 0.9f),
            )
        }
    }
}
