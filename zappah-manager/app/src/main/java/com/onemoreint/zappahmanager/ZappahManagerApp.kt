package com.onemoreint.zappahmanager

import android.app.Application
import com.onemoreint.zappahmanager.monitor.Notifier

class ZappahManagerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifier.createChannels(this)
    }
}
