package com.acc.agent.lab

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper

/**
 * Recibe comandos enviados por USB con `adb shell am broadcast`.
 * El manifiesto exige el permiso DUMP al emisor, que solo tiene el shell.
 * El resultado se devuelve como "data=" en la salida de am broadcast.
 */
class AdbCommandReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val parsed = LabCommandParser.parse(intent.getStringExtra("cmd"), intent.getStringExtra("value"))
        val actions = DpcActions(context)
        val message = parsed.fold(
            onSuccess = { actions.execute(it) },
            onFailure = { "ERROR: ${it.message}" },
        )
        setResult(if (message.startsWith("ERROR")) 1 else 0, message, null)

        if (parsed.getOrNull() == LabCommand.Reboot && message.startsWith("OK")) {
            // Responder primero y reiniciar medio segundo después.
            Handler(Looper.getMainLooper()).postDelayed({ runCatching { actions.reboot() } }, 500)
        }
    }

    companion object {
        const val ACTION = "com.acc.agent.COMMAND"
    }
}
