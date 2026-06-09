// FmoDeck 最小 Service Worker。
// 目的仅一个:满足浏览器 PWA「可安装」判定,让用户「添加到主屏幕」后以独立窗口
// (display: standalone)打开 —— 也就是隐藏地址栏。
//
// 刻意不做离线缓存:纯透传网络,避免缓存 Vite 哈希资源造成更新滞后/白屏。
// 存在一个 fetch 监听器即可被 Chrome 计入可安装条件。
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // 不拦截,交还浏览器默认网络请求。
})
