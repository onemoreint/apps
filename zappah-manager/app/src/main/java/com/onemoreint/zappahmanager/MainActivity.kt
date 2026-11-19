package com.onemoreint.zappahmanager

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import com.onemoreint.zappahmanager.ui.AppRoot
import com.onemoreint.zappahmanager.ui.theme.ZappahTheme

class MainActivity : ComponentActivity() {

    private val openOptions = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        openOptions.value = intent?.getBooleanExtra(EXTRA_OPEN_OPTIONS, false) == true
        setContent {
            ZappahTheme {
                AppRoot(
                    showOptions = openOptions.value,
                    onShowOptions = { openOptions.value = true },
                    onOptionsDismissed = { openOptions.value = false },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra(EXTRA_OPEN_OPTIONS, false)) openOptions.value = true
    }

    companion object {
        const val EXTRA_OPEN_OPTIONS = "abrir_opciones"
    }
}
