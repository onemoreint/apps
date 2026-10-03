package com.acc.agent.inventory

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import org.json.JSONObject

/**
 * Inventario mínimo, solo con APIs autorizadas. No recoge ubicación,
 * contactos, mensajes, IMEI ni la lista de apps personales.
 */
object DeviceInventory {

    fun collect(context: Context, isDeviceOwner: Boolean): JSONObject {
        val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val stat = StatFs(Environment.getDataDirectory().path)
        val mem = ActivityManager.MemoryInfo().also {
            context.getSystemService(ActivityManager::class.java).getMemoryInfo(it)
        }
        return JSONObject()
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put("androidVersion", Build.VERSION.RELEASE)
            .put("sdkInt", Build.VERSION.SDK_INT)
            .put("securityPatch", Build.VERSION.SECURITY_PATCH)
            .put("serial", if (isDeviceOwner) serial() else JSONObject.NULL)
            .put("batteryPct", if (level >= 0) level * 100 / scale else JSONObject.NULL)
            .put("storageFreeMb", stat.availableBytes / 1_048_576)
            .put("storageTotalMb", stat.totalBytes / 1_048_576)
            .put("memoryFreeMb", mem.availMem / 1_048_576)
            .put("managementMode", if (isDeviceOwner) "LAB_DEVICE_OWNER" else "NORMAL_APP")
    }

    /** Solo un Device Owner puede leer el número de serie desde Android 10. */
    @SuppressLint("MissingPermission", "HardwareIds")
    private fun serial(): Any = runCatching { Build.getSerial() }.getOrNull() ?: JSONObject.NULL
}
