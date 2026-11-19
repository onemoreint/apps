package com.onemoreint.zappahmanager.core

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.UserManager
import androidx.core.content.pm.PackageInfoCompat

data class AppEntry(
    val packageName: String,
    val label: String,
    val isSystem: Boolean,
)

data class PermissionEntry(val name: String, val granted: Boolean)

data class Diagnosis(
    val packageName: String,
    val label: String,
    val versionName: String?,
    val versionCode: Long,
    val targetSdk: Int,
    val enabled: Boolean,
    val enabledSettingLabel: String,
    val installer: String?,
    val firstInstallTime: Long,
    val lastUpdateTime: Long,
    val activeAdminComponents: List<String>,
    val facts: AppFacts,
    val permissions: List<PermissionEntry>,
)

/** Solo usa APIs públicas de PackageManager, DevicePolicyManager y UserManager. */
object AppInspector {

    fun installedApps(context: Context): List<AppEntry> {
        val pm = context.packageManager
        @Suppress("DEPRECATION")
        val apps = pm.getInstalledApplications(0)
        return apps.map {
            AppEntry(
                packageName = it.packageName,
                label = pm.getApplicationLabel(it).toString(),
                isSystem = (it.flags and ApplicationInfo.FLAG_SYSTEM) != 0,
            )
        }.sortedBy { it.label.lowercase() }
    }

    /** Busca por nombre visible o por paquete, sin suponer un identificador concreto. */
    fun findCandidates(context: Context, term: String = Prefs.SEARCH_TERM): List<AppEntry> =
        installedApps(context).filter {
            it.label.contains(term, ignoreCase = true) || it.packageName.contains(term, ignoreCase = true)
        }

    fun isInstalled(context: Context, packageName: String): Boolean = try {
        packageInfo(context.packageManager, packageName, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    }

    fun labelOf(context: Context, packageName: String): String? = try {
        val pm = context.packageManager
        val info = packageInfo(pm, packageName, 0).applicationInfo
        info?.let { pm.getApplicationLabel(it).toString() }
    } catch (e: PackageManager.NameNotFoundException) {
        null
    }

    fun diagnose(context: Context, packageName: String): Diagnosis? {
        val pm = context.packageManager
        val pi = try {
            packageInfo(pm, packageName, PackageManager.GET_PERMISSIONS)
        } catch (e: PackageManager.NameNotFoundException) {
            return null
        }
        val ai = pi.applicationInfo ?: return null

        val isSystem = (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0
        val isUpdatedSystem = (ai.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

        val dpm = context.getSystemService(DevicePolicyManager::class.java)
        val admins = try {
            dpm?.activeAdmins.orEmpty().filter { it.packageName == packageName }.map { it.flattenToShortString() }
        } catch (e: SecurityException) {
            emptyList()
        }
        val blocked: Boolean? = try {
            dpm?.isUninstallBlocked(null, packageName)
        } catch (e: Exception) {
            null
        }

        val um = context.getSystemService(UserManager::class.java)
        val noUninstall = um?.hasUserRestriction(UserManager.DISALLOW_UNINSTALL_APPS) == true
        val noAppsControl = um?.hasUserRestriction(UserManager.DISALLOW_APPS_CONTROL) == true

        val enabledSetting = try {
            pm.getApplicationEnabledSetting(packageName)
        } catch (e: IllegalArgumentException) {
            -1
        }

        val installer = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                pm.getInstallSourceInfo(packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                pm.getInstallerPackageName(packageName)
            }
        } catch (e: Exception) {
            null
        }

        val requested = pi.requestedPermissions.orEmpty()
        val flags = pi.requestedPermissionsFlags ?: IntArray(0)
        val permissions = requested.mapIndexed { i, name ->
            val granted = i < flags.size && (flags[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
            PermissionEntry(name, granted)
        }.sortedWith(compareByDescending<PermissionEntry> { it.granted }.thenBy { it.name })

        return Diagnosis(
            packageName = packageName,
            label = pm.getApplicationLabel(ai).toString(),
            versionName = pi.versionName,
            versionCode = PackageInfoCompat.getLongVersionCode(pi),
            targetSdk = ai.targetSdkVersion,
            enabled = ai.enabled,
            enabledSettingLabel = enabledSettingLabel(enabledSetting),
            installer = installer,
            firstInstallTime = pi.firstInstallTime,
            lastUpdateTime = pi.lastUpdateTime,
            activeAdminComponents = admins,
            facts = AppFacts(
                isSystemApp = isSystem,
                isUpdatedSystemApp = isUpdatedSystem,
                isActiveDeviceAdmin = admins.isNotEmpty(),
                uninstallBlockedByPolicy = blocked,
                restrictionUninstallApps = noUninstall,
                restrictionAppsControl = noAppsControl,
            ),
            permissions = permissions,
        )
    }

    /** Todos los administradores de dispositivo activos (de cualquier app). */
    fun allActiveAdmins(context: Context): List<String> = try {
        context.getSystemService(DevicePolicyManager::class.java)
            ?.activeAdmins.orEmpty().map { it.flattenToShortString() }
    } catch (e: SecurityException) {
        emptyList()
    }

    private fun enabledSettingLabel(value: Int): String = when (value) {
        PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> "Predeterminado (habilitada según el fabricante)"
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> "Habilitada"
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED -> "Deshabilitada"
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER -> "Deshabilitada por el usuario"
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED_UNTIL_USED -> "Deshabilitada hasta que se use"
        else -> "No disponible"
    }

    private fun packageInfo(pm: PackageManager, pkg: String, flags: Int): PackageInfo =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(flags.toLong()))
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(pkg, flags)
        }
}
