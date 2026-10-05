import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Trans } from 'react-i18next'
import { logger } from '@/lib/logger'

/** Captura errores de renderizado: mensaje amigable en pantalla, detalle técnico al logger. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('render_error', { error, componentStack: info.componentStack })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="size-10 text-warning" aria-hidden />
        <h1 className="text-lg font-semibold">
          <Trans i18nKey="errors.boundaryTitle" />
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          <Trans i18nKey="errors.boundaryBody" />
        </p>
        <button
          className="mt-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          <Trans i18nKey="common.retry" />
        </button>
      </div>
    )
  }
}
