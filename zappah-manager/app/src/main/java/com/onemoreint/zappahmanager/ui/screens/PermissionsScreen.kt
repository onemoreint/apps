package com.onemoreint.zappahmanager.ui.screens

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.SystemAccess
import com.onemoreint.zappahmanager.ui.ScreenColumn
import com.onemoreint.zappahmanager.ui.SectionCard
import com.onemoreint.zappahmanager.ui.StatusDot
import com.onemoreint.zappahmanager.ui.StatusLine
import com.onemoreint.zappahmanager.ui.UiState

@Composable
fun PermissionsScreen(state: UiState) {
    val context = LocalContext.current
    val usageOk = state.refreshKey.let { SystemAccess.hasUsageAccess(context) }
    val notifOk = state.refreshKey.let { SystemAccess.hasNotificationPermission(context) }
    val batteryOk = state.refreshKey.let { SystemAccess.isIgnoringBatteryOptimizations(context) }
    var showAll by remember { mutableStateOf(false) }

    ScreenColumn("Permisos", "Los de Zappah Manager y los que tiene la app vigilada.") {

        SectionCard("Zappah Manager") {
            StatusLine("Acceso a datos de uso", usageOk, "Ajustes > Seguridad y privacidad > Acceso a datos de uso")
            if (!usageOk) FilledTonalButton(onClick = { SystemAccess.openUsageAccess(context) }) { Text("Abrir") }
            StatusLine("Notificaciones", notifOk)
            if (!notifOk) FilledTonalButton(onClick = { SystemAccess.openNotificationSettings(context) }) { Text("Abrir") }
            StatusLine(
                "Sin optimización de batería",
                batteryOk,
                "Opcional. Ayuda a que MagicOS no apague el monitor.",
            )
            if (!batteryOk) {
                FilledTonalButton(onClick = { SystemAccess.openBatterySettings(context) }) { Text("Abrir batería") }
                Text(
                    "En HONOR también revisa: Ajustes > Batería > Inicio de apps > Zappah Manager > Gestionar manualmente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        val d = state.diagnosis
        SectionCard(if (d != null) "Permisos de ${d.label}" else "App vigilada") {
            if (d == null) {
                Text("Elige primero la app en Monitor.")
                return@SectionCard
            }
            val granted = d.permissions.count { it.granted }
            Text(
                "Declara ${d.permissions.size} permisos; $granted concedidos. " +
                    "Para cambiarlos usa la pantalla oficial de Android.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Button(onClick = { SystemAccess.openAppDetails(context, d.packageName) }, modifier = Modifier.fillMaxWidth()) {
                Text("Abrir información y permisos")
            }
            val list = if (showAll) d.permissions else d.permissions.filter { it.granted }
            list.forEach { p ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusDot(p.granted)
                    Spacer(Modifier.size(10.dp))
                    Text(
                        p.name.removePrefix("android.permission."),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            TextButton(onClick = { showAll = !showAll }) {
                Text(if (showAll) "Ver solo concedidos" else "Ver todos los declarados")
            }
            Text(
                "Concedido = Android lo confirma. Los permisos especiales (administrador, accesibilidad, " +
                    "superposición) se revisan desde la información de la app o Seguridad.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
