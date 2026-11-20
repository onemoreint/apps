package com.onemoreint.zappahmanager.monitor

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.onemoreint.zappahmanager.MainActivity
import com.onemoreint.zappahmanager.R
import com.onemoreint.zappahmanager.core.SystemAccess

object Notifier {
    const val CHANNEL_ALERTS = "zappah_alertas"
    const val CHANNEL_MONITOR = "zappah_monitor"
    const val ID_MONITOR = 1001
    const val ID_ALERT = 1002

    private const val RC_OPEN_OPTIONS = 10
    private const val RC_APP_INFO = 11
    private const val RC_DISMISS = 12
    private const val RC_STOP = 13
    private const val RC_OPEN_APP = 14

    fun createChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ALERTS,
                context.getString(R.string.channel_alerts),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = "Aviso cuando la app vigilada se abre." }
        )
        nm.createNotificationChannel(
            NotificationChannel(
                CHANNEL_MONITOR,
                context.getString(R.string.channel_monitor),
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Notificación fija mientras el monitor está encendido." }
        )
    }

    private fun immutable(update: Boolean = true) =
        PendingIntent.FLAG_IMMUTABLE or (if (update) PendingIntent.FLAG_UPDATE_CURRENT else 0)

    fun monitorNotification(context: Context, targetLabel: String): Notification {
        val open = PendingIntent.getActivity(
            context, RC_OPEN_APP,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            immutable(),
        )
        val stop = PendingIntent.getService(
            context, RC_STOP,
            Intent(context, MonitorService::class.java).setAction(MonitorService.ACTION_STOP),
            immutable(),
        )
        return NotificationCompat.Builder(context, CHANNEL_MONITOR)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Monitor activo")
            .setContentText("Vigilando: $targetLabel")
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(0, "Detener", stop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    /** Muestra el aviso pedido: "Zappah detectada. ¿Deseas revisar sus opciones de administración?" */
    fun showDetection(context: Context, targetPackage: String) {
        val canPost = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        if (!canPost) return

        val message = context.getString(R.string.alert_message)

        val options = PendingIntent.getActivity(
            context, RC_OPEN_OPTIONS,
            Intent(context, MainActivity::class.java)
                .putExtra(MainActivity.EXTRA_OPEN_OPTIONS, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            immutable(),
        )
        val appInfo = PendingIntent.getActivity(
            context, RC_APP_INFO,
            SystemAccess.appDetailsIntent(targetPackage).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            immutable(),
        )
        val dismiss = PendingIntent.getBroadcast(
            context, RC_DISMISS,
            Intent(context, DismissReceiver::class.java),
            immutable(),
        )

        val n = NotificationCompat.Builder(context, CHANNEL_ALERTS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Zappah Manager")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setAutoCancel(true)
            .setContentIntent(options)
            .addAction(0, "Información", appInfo)
            .addAction(0, "Opciones", options)
            .addAction(0, "Cancelar", dismiss)
            .build()

        NotificationManagerCompat.from(context).notify(ID_ALERT, n)
    }

    fun cancelDetection(context: Context) {
        NotificationManagerCompat.from(context).cancel(ID_ALERT)
    }
}
