package com.acc.agent

import android.app.Activity
import android.app.AlertDialog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.acc.agent.config.AgentConfig
import com.acc.agent.lab.DpcActions
import com.acc.agent.lab.LabCommand

/**
 * Pantalla de estado y transparencia: la persona ve en todo momento si el
 * agente administra el teléfono y qué restricciones están activas.
 */
class MainActivity : Activity() {

    private lateinit var actions: DpcActions
    private lateinit var status: TextView
    private lateinit var controls: LinearLayout
    private lateinit var help: TextView

    private val restrictionsChanged = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            AgentConfig.schedule(context)
            refresh()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        actions = DpcActions(this)
        val pad = (16 * resources.displayMetrics.density).toInt()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        root.addView(TextView(this).apply {
            text = getString(R.string.app_name)
            textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
        })
        status = TextView(this).apply {
            textSize = 15f
            setPadding(0, pad / 2, 0, pad)
        }
        root.addView(status)

        help = TextView(this).apply {
            textSize = 14f
            setTextIsSelectable(true)
            text = """
                El agente aún no administra este teléfono.

                Para activarlo por USB (laboratorio):
                1. Quita las cuentas del teléfono (Google, Honor).
                2. En tu computador ejecuta:
                adb shell dpm set-device-owner ${DpcActions.COMPONENT}

                Guía completa: github.com/onemoreint/apps (rama android-control-center)
            """.trimIndent()
        }
        root.addView(help)

        controls = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        fun button(label: String, onClick: () -> Unit) = Button(this).apply {
            text = label
            isAllCaps = false
            setOnClickListener { onClick() }
            controls.addView(this)
        }
        button("Bloquear pantalla") { run(LabCommand.Lock) }
        button("Desactivar cámara") { run(LabCommand.Camera(true)) }
        button("Activar cámara") { run(LabCommand.Camera(false)) }
        button("Bloquear capturas de pantalla") { run(LabCommand.ScreenCapture(true)) }
        button("Permitir capturas de pantalla") { run(LabCommand.ScreenCapture(false)) }
        button("Enviar heartbeat ahora") { run(LabCommand.Heartbeat) }
        button("Liberar administración") {
            AlertDialog.Builder(this)
                .setTitle("Liberar administración")
                .setMessage("Se quitan todas las restricciones y el agente deja de ser Device Owner. Después podrás desinstalarlo.")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Liberar") { _, _ -> run(LabCommand.Release) }
                .show()
        }
        root.addView(controls)

        root.addView(TextView(this).apply {
            textSize = 12f
            setTextColor(Color.GRAY)
            setPadding(0, pad, 0, 0)
            text = "Este agente no recoge ubicación, contactos, mensajes ni apps personales, y no puede borrar el teléfono."
        })

        setContentView(ScrollView(this).apply { addView(root) })
    }

    override fun onStart() {
        super.onStart()
        ContextCompat.registerReceiver(
            this,
            restrictionsChanged,
            IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        AgentConfig.schedule(this)
        refresh()
    }

    override fun onStop() {
        unregisterReceiver(restrictionsChanged)
        super.onStop()
    }

    private fun run(command: LabCommand) {
        val result = actions.execute(command)
        Toast.makeText(this, result, Toast.LENGTH_LONG).show()
        refresh()
    }

    private fun refresh() {
        val owner = actions.isDeviceOwner()
        status.text = actions.status().replace(" | ", "\n")
        status.setTextColor(if (owner) Color.rgb(31, 111, 92) else Color.rgb(183, 121, 31))
        help.visibility = if (owner) View.GONE else View.VISIBLE
        controls.visibility = if (owner) View.VISIBLE else View.GONE
    }
}
