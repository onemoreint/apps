package com.onemoreint.zappahmanager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.onemoreint.zappahmanager.core.Prefs
import com.onemoreint.zappahmanager.ui.ScreenColumn
import com.onemoreint.zappahmanager.ui.SectionCard

@Composable
fun SettingsScreen(prefs: Prefs, onResetTarget: () -> Unit) {
    var cooldown by remember { mutableIntStateOf(prefs.cooldownSeconds) }

    ScreenColumn("Configuración") {
        SectionCard("Espera entre avisos") {
            Text(
                "Evita avisos repetidos si entras y sales de la app varias veces. Se aplica al reiniciar el monitor.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(30 to "30 s", 60 to "1 min", 300 to "5 min", 900 to "15 min").forEach { (sec, label) ->
                    FilterChip(
                        selected = cooldown == sec,
                        onClick = {
                            cooldown = sec
                            prefs.cooldownSeconds = sec
                        },
                        label = { Text(label) },
                    )
                }
            }
        }

        SectionCard("App vigilada") {
            OutlinedButton(onClick = onResetTarget, modifier = Modifier.fillMaxWidth()) {
                Text("Olvidar la app elegida")
            }
        }

        SectionCard("Qué hace y qué no hace") {
            listOf(
                "Usa solo APIs públicas de Android; no necesita root.",
                "Nunca desinstala nada por sí misma: siempre abre el diálogo oficial y tú confirmas.",
                "No desactiva administradores de dispositivo ni evita políticas de empresa, financiera o MDM.",
                "Si Android bloquea una acción, te explica la causa conocida y las vías autorizadas.",
                "No envía datos fuera del teléfono.",
            ).forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
        }

        SectionCard("Acerca de") {
            Text("Zappah Manager 0.1.0 · versión de depuración", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
