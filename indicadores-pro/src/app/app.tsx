import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from './error-boundary'
import { AppProviders } from './providers'
import { PwaUpdater } from './pwa'
import { createRouter } from './router'

export function App() {
  const [router] = useState(createRouter)
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <PwaUpdater />
      </AppProviders>
    </ErrorBoundary>
  )
}
