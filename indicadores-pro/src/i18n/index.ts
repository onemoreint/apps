import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'

const LOCALE_KEY = 'ip.locale'

function initialLocale(): 'es' | 'en' {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    /* sin almacenamiento */
  }
  return 'es'
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initialLocale(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLocale(locale: 'es' | 'en') {
  void i18n.changeLanguage(locale)
  document.documentElement.lang = locale
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* sin almacenamiento */
  }
}

export default i18n
