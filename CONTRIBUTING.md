# Cómo contribuir

Gracias por ayudar a Android Control Center.

## Regla principal

Cada función debe usar una **API oficial** de Android o de la Android Management API. No se aceptan contribuciones que usen exploits, root, servicios de accesibilidad para controlar otras apps, comandos ADB no autorizados, ni que intenten evadir políticas o controles de seguridad. Si algo no se puede hacer en un modo de administración, se documenta en el motor de capacidades en lugar de forzarlo.

## Flujo

1. Abre un issue describiendo el cambio y qué API oficial usa.
2. Crea una rama desde `main`: `feat/…`, `fix/…` o `docs/…`.
3. Mantén las pruebas en verde:
   ```bash
   cd web && npm test && npm run build
   cd backend && ./gradlew test
   cd android-agent && ./gradlew test assembleDebug
   ```
4. Si cambias el motor de capacidades, actualiza a la vez `web/src/lib/capabilities.ts`, `backend/.../CapabilityEngine.kt` y `docs/capability-matrix.md`.
5. Abre un pull request con capturas si tocas la interfaz.

## Estilo

- Textos de la interfaz en español, en frases claras y en voz activa.
- Kotlin con el estilo oficial; TypeScript estricto.
- Commits en presente: «Añade filtro por etiqueta».

Al contribuir aceptas que tu aporte se publique bajo la licencia Apache-2.0 y el [código de conducta](CODE_OF_CONDUCT.md).
