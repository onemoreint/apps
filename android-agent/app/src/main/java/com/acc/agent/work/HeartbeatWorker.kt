package com.acc.agent.work

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequest
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.acc.agent.config.AgentConfig
import com.acc.agent.inventory.DeviceInventory
import com.acc.agent.lab.DpcActions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/** Envía inventario y estado al backend: POST {backend}/api/agent/heartbeat */
class HeartbeatWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val backend = AgentConfig.backendUrl(applicationContext)
        if (backend.isEmpty()) return@withContext Result.success()

        val owner = DpcActions(applicationContext).isDeviceOwner()
        val body = DeviceInventory.collect(applicationContext, owner)
            .put("agentVersion", AgentConfig.agentVersion(applicationContext))
            .put("enrollmentSecret", AgentConfig.enrollmentSecret(applicationContext))
            .toString()
            .toRequestBody(JSON)

        val request = Request.Builder().url("$backend/api/agent/heartbeat").post(body).build()
        try {
            client.newCall(request).execute().use { response ->
                Log.i(TAG, "heartbeat -> ${response.code}")
                when {
                    response.isSuccessful -> Result.success()
                    response.code in 400..499 -> Result.failure() // configuración incorrecta: no reintentar
                    else -> Result.retry()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "heartbeat falló: ${e.message}")
            Result.retry()
        }
    }

    companion object {
        const val UNIQUE = "acc-heartbeat"
        private const val TAG = "ACC"
        private val JSON = "application/json; charset=utf-8".toMediaType()
        private val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()

        private val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun periodic(minutes: Long): PeriodicWorkRequest =
            PeriodicWorkRequestBuilder<HeartbeatWorker>(minutes, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

        fun runOnce(context: Context) {
            WorkManager.getInstance(context).enqueue(
                OneTimeWorkRequestBuilder<HeartbeatWorker>().setConstraints(constraints).build(),
            )
        }
    }
}
