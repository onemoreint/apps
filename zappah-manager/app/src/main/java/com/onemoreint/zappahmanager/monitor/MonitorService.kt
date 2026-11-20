package com.onemoreint.zappahmanager.monitor

import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.onemoreint.zappahmanager.core.AppInspector
import com.onemoreint.zappahmanager.core.DetectionGate
import com.onemoreint.zappahmanager.core.Prefs
import com.onemoreint.zappahmanager.core.SystemAccess
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Servicio en primer plano que consulta los eventos de uso (UsageStatsManager)
 * cada pocos segundos para saber qué app pasó a primer plano.
 * No lee contenido de otras apps, no interactúa con ellas y no las modifica.
 */
class MonitorService : Service() {

    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    private var gate: DetectionGate? = null
    private var target: String? = null
    private var lastEventTime = 0L

    private val poll = object : Runnable {
        override fun run() {
            checkEvents()
            handler?.postDelayed(this, POLL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopEverything()
            return START_NOT_STICKY
        }

        val prefs = Prefs(this)
        val pkg = prefs.targetPackage
        val label = pkg?.let { AppInspector.labelOf(this, it) ?: it } ?: "sin app elegida"
        // Siempre se pasa a primer plano antes de cualquier stopSelf(): si un servicio iniciado con
        // startForegroundService() se detiene sin hacerlo, Android 8+ cierra la app.
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        } else {
            0
        }
        try {
            ServiceCompat.startForeground(this, Notifier.ID_MONITOR, Notifier.monitorNotification(this, label), type)
        } catch (e: Exception) {
            // Android 12+ puede rechazar iniciar el servicio desde segundo plano.
            Log.e(TAG, "No se pudo iniciar en primer plano", e)
            stopEverything()
            return START_NOT_STICKY
        }

        if (pkg == null || !SystemAccess.hasUsageAccess(this)) {
            Log.w(TAG, "Sin app objetivo o sin acceso a datos de uso; no se inicia.")
            stopEverything()
            return START_NOT_STICKY
        }

        target = pkg
        gate = DetectionGate(pkg, prefs.cooldownSeconds * 1000L)
        lastEventTime = System.currentTimeMillis()

        if (thread == null) {
            thread = HandlerThread("zappah-monitor").also { it.start() }
            handler = Handler(thread!!.looper)
        }
        handler?.removeCallbacks(poll)
        handler?.post(poll)
        _running.value = true
        return START_STICKY
    }

    private fun checkEvents() {
        val pkg = target ?: return
        val g = gate ?: return
        if (!SystemAccess.hasUsageAccess(this)) {
            Log.w(TAG, "Se retiró el acceso a datos de uso; deteniendo.")
            handler?.post { stopEverything() }
            return
        }
        val usm = getSystemService(UsageStatsManager::class.java) ?: return
        val now = System.currentTimeMillis()
        val events = usm.queryEvents(lastEventTime - OVERLAP_MS, now) ?: return
        val e = UsageEvents.Event()
        var newest = lastEventTime
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            if (e.timeStamp <= lastEventTime) continue
            if (e.eventType == RESUMED) {
                if (g.onForeground(e.packageName, e.timeStamp) && e.packageName == pkg) {
                    Notifier.showDetection(this, pkg)
                }
            }
            if (e.timeStamp > newest) newest = e.timeStamp
        }
        lastEventTime = newest
    }

    private fun stopEverything() {
        handler?.removeCallbacks(poll)
        thread?.quitSafely()
        thread = null
        handler = null
        _running.value = false
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        handler?.removeCallbacks(poll)
        thread?.quitSafely()
        _running.value = false
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "com.onemoreint.zappahmanager.STOP_MONITOR"
        private const val TAG = "ZappahMonitor"
        private const val POLL_MS = 2_000L
        private const val OVERLAP_MS = 1_000L

        /** ACTIVITY_RESUMED (API 29+) tiene el mismo valor que MOVE_TO_FOREGROUND (API 21+). */
        private const val RESUMED = 1

        private val _running = MutableStateFlow(false)
        val running: StateFlow<Boolean> = _running

        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, MonitorService::class.java))
        }

        fun stop(context: Context) {
            context.startService(Intent(context, MonitorService::class.java).setAction(ACTION_STOP))
        }
    }
}
