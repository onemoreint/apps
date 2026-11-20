package com.onemoreint.zappahmanager.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Teal = Color(0xFF4FD1C5)
val Ok = Color(0xFF3DDC97)
val Warn = Color(0xFFFFB547)
val Bad = Color(0xFFFF6B6B)

private val Dark = darkColorScheme(
    primary = Teal,
    onPrimary = Color(0xFF00201D),
    primaryContainer = Color(0xFF123A3A),
    onPrimaryContainer = Color(0xFFB8F3EC),
    secondary = Color(0xFF9AA8FF),
    background = Color(0xFF0B1020),
    onBackground = Color(0xFFE6E9F2),
    surface = Color(0xFF0B1020),
    onSurface = Color(0xFFE6E9F2),
    surfaceVariant = Color(0xFF161D33),
    onSurfaceVariant = Color(0xFFA4ACC4),
    surfaceContainer = Color(0xFF121933),
    surfaceContainerHigh = Color(0xFF1A2240),
    outline = Color(0xFF2A3354),
    outlineVariant = Color(0xFF222A47),
    error = Bad,
)

private val Light = lightColorScheme(
    primary = Color(0xFF00897B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFCDF3EE),
    onPrimaryContainer = Color(0xFF00201D),
    secondary = Color(0xFF4A5BD4),
    background = Color(0xFFF6F7FB),
    onBackground = Color(0xFF111528),
    surface = Color(0xFFF6F7FB),
    onSurface = Color(0xFF111528),
    surfaceVariant = Color(0xFFFFFFFF),
    onSurfaceVariant = Color(0xFF5A627A),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerHigh = Color(0xFFEDEFF6),
    outline = Color(0xFFD5D9E6),
    outlineVariant = Color(0xFFE3E6EF),
    error = Color(0xFFD64545),
)

private val AppTypography = Typography(
    headlineMedium = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.3).sp),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.4.sp),
)

@Composable
fun ZappahTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        typography = AppTypography,
        content = content,
    )
}
