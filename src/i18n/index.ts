import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export type AppLanguage = 'zh-CN' | 'en'

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['zh-CN', 'en']

const STORAGE_KEY = 'fmodeck-language'

function detectInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'zh-CN'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'zh-CN') return stored
  const browser = window.navigator.language
  if (browser.startsWith('en')) return 'en'
  return 'zh-CN'
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en }
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false // React 自带 XSS 防护
  }
})

/** 切换语言并持久化到 localStorage。 */
export function setAppLanguage(lang: AppLanguage): void {
  void i18n.changeLanguage(lang)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lang)
  }
}

export default i18n
