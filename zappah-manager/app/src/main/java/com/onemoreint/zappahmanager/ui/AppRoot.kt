package com.onemoreint.zappahmanager.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.onemoreint.zappahmanager.core.AppEntry
import com.onemoreint.zappahmanager.core.AppInspector
import com.onemoreint.zappahmanager.core.Diagnosis
import com.onemoreint.zappahmanager.core.Prefs
import com.onemoreint.zappahmanager.monitor.MonitorService
import com.onemoreint.zappahmanager.ui.screens.DiagnosisScreen
import com.onemoreint.zappahmanager.ui.screens.HomeScreen
import com.onemoreint.zappahmanager.ui.screens.MonitorScreen
import com.onemoreint.zappahmanager.ui.screens.OptionsDialog
import com.onemoreint.zappahmanager.ui.screens.PermissionsScreen
import com.onemoreint.zappahmanager.ui.screens.SettingsScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class Tab(val label: String, val icon: ImageVector) {
    INICIO("Inicio", Icons.Filled.Home),
    DIAGNOSTICO("Diagnóstico", Icons.Filled.Search),
    MONITOR("Monitor", Icons.Filled.Notifications),
    PERMISOS("Permisos", Icons.Filled.Lock),
    AJUSTES("Ajustes", Icons.Filled.Settings),
}

/** Estado compartido entre pantallas. */
class UiState(
    val target: String?,
    val diagnosis: Diagnosis?,
    val candidates: List<AppEntry>?,
    val monitorRunning: Boolean,
    val refreshKey: Int,
)

@Composable
fun AppRoot(showOptions: Boolean, onShowOptions: () -> Unit, onOptionsDismissed: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { Prefs(context) }

    var tab by rememberSaveable { mutableStateOf(Tab.INICIO) }
    var target by remember { mutableStateOf(prefs.targetPackage) }
    var refresh by remember { mutableIntStateOf(0) }
    var candidates by remember { mutableStateOf<List<AppEntry>?>(null) }
    val running by MonitorService.running.collectAsState()

    // Al volver de Ajustes se refresca todo (permisos, estado de la app, etc.).
    LifecycleResumeEffect(Unit) {
        refresh++
        onPauseOrDispose { }
    }

    LaunchedEffect(refresh) {
        val found = withContext(Dispatchers.IO) { AppInspector.findCandidates(context) }
        candidates = found
        val current = target
        if (current != null && !AppInspector.isInstalled(context, current)) {
            // La app elegida ya no está instalada.
            prefs.targetPackage = null
            target = null
        }
        if (target == null && found.size == 1) {
            prefs.targetPackage = found.first().packageName
            target = found.first().packageName
        }
    }

    val diagnosis by produceState<Diagnosis?>(initialValue = null, target, refresh) {
        value = target?.let { pkg -> withContext(Dispatchers.IO) { AppInspector.diagnose(context, pkg) } }
    }

    val selectTarget: (String?) -> Unit = { pkg ->
        prefs.targetPackage = pkg
        target = pkg
        if (running) {
            if (pkg == null) MonitorService.stop(context) else MonitorService.start(context) // recarga la app objetivo
        }
        refresh++
    }

    val state = UiState(target, diagnosis, candidates, running, refresh)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label, maxLines = 1) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (tab) {
                Tab.INICIO -> HomeScreen(state, onGo = { tab = it }, onOpenOptions = onShowOptions)
                Tab.DIAGNOSTICO -> DiagnosisScreen(state, onChooseApp = { tab = Tab.MONITOR })
                Tab.MONITOR -> MonitorScreen(state, prefs, onSelect = selectTarget)
                Tab.PERMISOS -> PermissionsScreen(state)
                Tab.AJUSTES -> SettingsScreen(prefs, onResetTarget = { selectTarget(null) })
            }
        }
    }

    if (showOptions) {
        OptionsDialog(state, onDismiss = onOptionsDismissed, onGoDiagnosis = {
            onOptionsDismissed()
            tab = Tab.DIAGNOSTICO
        })
    }
}
