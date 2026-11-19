package com.onemoreint.zappahmanager.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.AppEntry
import com.onemoreint.zappahmanager.core.AppInspector
import com.onemoreint.zappahmanager.core.Prefs
import com.onemoreint.zappahmanager.core.SystemAccess
import com.onemoreint.zappahmanager.monitor.MonitorService
import com.onemoreint.zappahmanager.ui.ScreenColumn
import com.onemoreint.zappahmanager.ui.SectionCard
import com.onemoreint.zappahmanager.ui.StatusLine
import com.onemoreint.zappahmanager.ui.UiState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun MonitorScreen(state: UiState, prefs: Prefs, onSelect: (String?) -> Unit) {
    val context = LocalContext.current
    var showPicker by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    // La referencia a refreshKey hace que se recalculen al volver de Ajustes.
    val usageOk = state.refreshKey.let { SystemAccess.hasUsageAccess(context) }
    val notifOk = state.refreshKey.let { SystemAccess.hasNotificationPermission(context) }

    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (!granted) message = "Sin permiso de notificaciones no se puede mostrar el aviso. Puedes activarlo en Permisos."
    }

    ScreenColumn("Monitor", "Avisa cuando la app elegida pasa a primer plano.") {

        SectionCard("1 · App a vigilar") {
            val candidates = state.candidates
            when {
                candidates == null -> Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.padding(end = 12.dp))
                    Text("Buscando “Zappah”…")
                }
                candidates.isEmpty() -> Text(
                    "No hay apps con “Zappah” en el nombre o el paquete. Usa “Elegir otra app”.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                else -> candidates.forEach { app ->
                    AppRow(app, selected = app.packageName == state.target) { onSelect(app.packageName) }
                }
            }
            if (state.target != null && candidates?.none { it.packageName == state.target } == true) {
                Text("Elegida a mano:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                AppRow(
                    AppEntry(state.target, AppInspector.labelOf(context, state.target) ?: state.target, false),
                    selected = true,
                ) {}
            }
            OutlinedButton(onClick = { showPicker = true }, modifier = Modifier.fillMaxWidth()) { Text("Elegir otra app") }
        }

        SectionCard("2 · Permisos necesarios") {
            StatusLine("Acceso a datos de uso", usageOk, if (usageOk) "Concedido" else "Necesario para saber qué app está abierta")
            if (!usageOk) {
                FilledTonalButton(onClick = { SystemAccess.openUsageAccess(context) }) { Text("Conceder acceso") }
            }
            StatusLine("Notificaciones", notifOk, if (notifOk) "Concedidas" else "Necesarias para mostrar el aviso")
            if (!notifOk) {
                FilledTonalButton(onClick = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    } else {
                        SystemAccess.openNotificationSettings(context)
                    }
                }) { Text("Permitir notificaciones") }
            }
        }

        SectionCard("3 · Encender") {
            StatusLine(
                if (state.monitorRunning) "Monitor encendido" else "Monitor apagado",
                state.monitorRunning,
                "Espera entre avisos: ${prefs.cooldownSeconds} s (cámbialo en Ajustes).",
            )
            if (state.monitorRunning) {
                Button(onClick = { MonitorService.stop(context) }, modifier = Modifier.fillMaxWidth()) { Text("Detener monitoreo") }
            } else {
                Button(
                    onClick = {
                        message = when {
                            state.target == null -> "Primero elige la app a vigilar."
                            !usageOk -> "Falta el acceso a datos de uso."
                            else -> {
                                if (!notifOk && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                }
                                MonitorService.start(context)
                                null
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Iniciar monitoreo") }
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Text(
                "En HONOR/MagicOS el sistema puede cerrar servicios en segundo plano. Si el monitor se apaga solo, " +
                    "revisa la batería en la pestaña Permisos.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }

    if (showPicker) {
        AppPickerDialog(
            onDismiss = { showPicker = false },
            onPick = {
                onSelect(it)
                showPicker = false
            },
        )
    }
}

@Composable
private fun AppRow(app: AppEntry, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Column(Modifier.weight(1f)) {
            Text(app.label, style = MaterialTheme.typography.bodyMedium)
            Text(
                app.packageName + if (app.isSystem) " · sistema" else "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AppPickerDialog(onDismiss: () -> Unit, onPick: (String) -> Unit) {
    val context = LocalContext.current
    var query by remember { mutableStateOf("") }
    val apps by produceState<List<AppEntry>?>(initialValue = null) {
        value = withContext(Dispatchers.IO) { AppInspector.installedApps(context) }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Elegir app") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Buscar por nombre o paquete") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                val list = apps
                if (list == null) {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                } else {
                    val filtered = list.filter {
                        query.isBlank() || it.label.contains(query, true) || it.packageName.contains(query, true)
                    }
                    LazyColumn(Modifier.heightIn(max = 380.dp)) {
                        items(filtered, key = { it.packageName }) { app ->
                            AppRow(app, selected = false) { onPick(app.packageName) }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cerrar") } },
    )
}
