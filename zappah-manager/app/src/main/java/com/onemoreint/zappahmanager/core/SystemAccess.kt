package com.onemoreint.zappahmanager.core

import android.Manifest
import android.app.AppOpsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/** Estado de los permisos de Zappah Manager y accesos a las pantallas oficiales de Android. */
object SystemAccess {

    fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(AppOpsManager::class.java) ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        }
        return if (mode == AppOpsManager.MODE_DEFAULT) {
            context.checkCallingOrSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
        } else {
            mode == AppOpsManager.MODE_ALLOWED
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        val runtimeOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        return runtimeOk && NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    fun isIgnoringBatteryOptimizations(context: Context): Boolean =
        context.getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(context.packageName) == true

    // ---- Intents oficiales ----

    fun appDetailsIntent(pkg: String) =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))

    @Suppress("DEPRECATION")
    fun uninstallIntent(pkg: String) =
        Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg"))

    fun openAppDetails(context: Context, pkg: String) =
        launch(context, appDetailsIntent(pkg), Intent(Settings.ACTION_APPLICATION_SETTINGS))

    fun requestUninstall(context: Context, pkg: String) =
        launch(context, uninstallIntent(pkg), appDetailsIntent(pkg))

    fun openUsageAccess(context: Context) =
        launch(context, Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS), Intent(Settings.ACTION_SETTINGS))

    fun openNotificationSettings(context: Context) {
        val i = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        launch(context, i, appDetailsIntent(context.packageName))
    }

    fun openBatterySettings(context: Context) =
        launch(context, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), appDetailsIntent(context.packageName))

    /** No hay intent público para "Administradores de dispositivo"; se abre Seguridad. */
    fun openSecuritySettings(context: Context) =
        launch(context, Intent(Settings.ACTION_SECURITY_SETTINGS), Intent(Settings.ACTION_SETTINGS))

    private fun launch(context: Context, intent: Intent, fallback: Intent) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: ActivityNotFoundException) {
            try {
                context.startActivity(fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e2: ActivityNotFoundException) {
                Toast.makeText(context, "Este teléfono no tiene esa pantalla de Ajustes.", Toast.LENGTH_LONG).show()
            }
        } catch (e: SecurityException) {
            Toast.makeText(context, "Android no permitió abrir esa pantalla.", Toast.LENGTH_LONG).show()
        }
    }
}
