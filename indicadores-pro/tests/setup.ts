import '@testing-library/jest-dom/vitest'
import '@/i18n'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

const isBrowserEnv = typeof window !== 'undefined'

afterEach(() => {
  if (!isBrowserEnv) return
  cleanup()
  localStorage.clear()
})

// jsdom no implementa matchMedia
if (isBrowserEnv && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
