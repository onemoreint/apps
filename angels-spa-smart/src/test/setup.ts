import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
// jsdom no implementa scrollTo
window.scrollTo = (() => {}) as typeof window.scrollTo
