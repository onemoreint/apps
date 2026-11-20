package com.onemoreint.zappahmanager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.SystemAccess
import com.onemoreint.zappahmanager.core.UninstallAssessor
import com.onemoreint.zappahmanager.ui.UiState

private enum class Step { MENU, DESACTIVAR, BLOQUEADO }

/** Las cuatro opciones pedidas: información, desactivación, desinstalación y cancelar. */
@Composable
fun OptionsDialog(state: UiState, onDismiss: () -> Unit, onGoDiagnosis: () -> Unit) {
    val context = LocalContext.current
    val d = state.diagnosis
    val pkg = state.target
    var step by remember { mutableStateOf(Step.MENU) }

    if (pkg == null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Sin app elegida") },
            text = { Text("Elige primero la app a vigilar en la pestaña Monitor.") },
            confirmButton = { TextButton(onClick = onDismiss) { Text("Entendido") } },
        )
        return
    }

    val assessment = d?.let { UninstallAssessor.assess(it.facts) }
    val name = d?.label ?: pkg

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                when (step) {
                    Step.MENU -> "Opciones para $name"
                    Step.DESACTIVAR -> "Opciones de desactivación"
                    Step.BLOQUEADO -> "Android no lo permite ahora"
                }
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                when (step) {
                    Step.MENU -> {
                        Text(
                            assessment?.summary ?: "Cargando diagnóstico…",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(onClick = {
                            SystemAccess.openAppDetails(context, pkg)
                            onDismiss()
                        }, modifier = Modifier.fillMaxWidth()) { Text("Abrir información de la aplicación") }
                        FilledTonalButton(onClick = { step = Step.DESACTIVAR }, modifier = Modifier.fillMaxWidth()) {
                            Text("Consultar opciones de desactivación")
                        }
                        OutlinedButton(onClick = {
                            if (assessment?.canRequestUninstall == true) {
                                SystemAccess.requestUninstall(context, pkg)
                                onDismiss()
                            } else {
                                step = Step.BLOQUEADO
                            }
                        }, modifier = Modifier.fillMaxWidth()) { Text("Solicitar desinstalación") }
                    }

                    Step.DESACTIVAR -> {
                        listOf(
                            "Deshabilitar: Ajustes > Aplicaciones > Aplicaciones > $name > Deshabilitar. " +
                                "Si el botón no aparece o está gris, el fabricante o una política no lo permiten.",
                            "Forzar detención: en la misma pantalla. Es temporal; la app puede volver a iniciarse.",
                            "Quitar permisos: en la misma pantalla, apartado Permisos.",
                            "Administrador de dispositivo: Ajustes > Seguridad > Más ajustes > Administradores de " +
                                "dispositivo. Si el interruptor de $name está gris, no se puede quitar desde el teléfono.",
                        ).forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
                        Button(onClick = {
                            SystemAccess.openAppDetails(context, pkg)
                            onDismiss()
                        }, modifier = Modifier.fillMaxWidth()) { Text("Abrir información de la app") }
                        OutlinedButton(onClick = {
                            SystemAccess.openSecuritySettings(context)
                            onDismiss()
                        }, modifier = Modifier.fillMaxWidth()) { Text("Abrir Seguridad") }
                    }

                    Step.BLOQUEADO -> {
                        val blocks = assessment?.findings.orEmpty()
                            .filter { it.severity == com.onemoreint.zappahmanager.core.Severity.BLOQUEO }
                        if (blocks.isEmpty()) {
                            Text("Aún no hay diagnóstico. Revisa la pestaña Diagnóstico.")
                        }
                        blocks.forEach {
                            Text(it.title, style = MaterialTheme.typography.titleMedium)
                            Text(it.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("Opciones autorizadas:", style = MaterialTheme.typography.titleMedium)
                        assessment?.authorizedOptions.orEmpty().forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
                        FilledTonalButton(onClick = onGoDiagnosis, modifier = Modifier.fillMaxWidth()) { Text("Ver diagnóstico completo") }
                    }
                }
            }
        },
        confirmButton = {
            if (step != Step.MENU) TextButton(onClick = { step = Step.MENU }) { Text("Volver") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}
