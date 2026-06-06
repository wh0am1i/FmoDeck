import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import i18n from '@/i18n'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// jsdom 的 navigator.language 默认是 en-US，这里强制测试环境用 zh-CN，
// 以便按中文断言的现有用例继续工作。
beforeAll(async () => {
  await i18n.changeLanguage('zh-CN')
})

afterEach(() => {
  cleanup()
  // BrowserRouter 依赖 window.location；测试之间重置 URL 到根路径，
  // 避免前一个测试导航到非首页后影响下一个测试。
  window.history.pushState({}, '', '/')
})

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    })
  })
}
