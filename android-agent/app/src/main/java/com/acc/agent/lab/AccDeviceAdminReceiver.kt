package com.acc.agent.lab

import android.app.admin.DeviceAdminReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Receptor de administración. Se convierte en Device Owner con:
 *   adb shell dpm set-device-owner com.acc.agent/.lab.AccDeviceAdminReceiver
 */
class AccDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        Log.i(TAG, "Administración activada")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.i(TAG, "Administración desactivada")
    }

    companion object {
        const val TAG = "ACC"
        fun component(context: Context) = ComponentName(context, AccDeviceAdminReceiver::class.java)
    }
}
