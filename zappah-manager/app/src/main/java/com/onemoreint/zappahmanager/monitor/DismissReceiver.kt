package com.onemoreint.zappahmanager.monitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Acción "Cancelar" del aviso: solo lo cierra. */
class DismissReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Notifier.cancelDetection(context)
    }
}
