package com.onemoreint.zappahmanager.core

import android.content.Context

/** Ajustes locales. No se guarda nada fuera del teléfono. */
class Prefs(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("zappah_prefs", Context.MODE_PRIVATE)

    var targetPackage: String?
        get() = sp.getString(KEY_TARGET, null)
        set(value) = sp.edit().apply { if (value == null) remove(KEY_TARGET) else putString(KEY_TARGET, value) }.apply()

    var cooldownSeconds: Int
        get() = sp.getInt(KEY_COOLDOWN, 60)
        set(value) = sp.edit().putInt(KEY_COOLDOWN, value).apply()

    companion object {
        private const val KEY_TARGET = "target_package"
        private const val KEY_COOLDOWN = "cooldown_seconds"
        const val SEARCH_TERM = "zappah"
    }
}
