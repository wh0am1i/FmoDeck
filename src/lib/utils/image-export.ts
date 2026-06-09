/**
 * 图片导出(下载 / 分享)在两类环境下走不同实现：
 *
 * - **浏览器 / Tauri 桌面**：`<a download>` 触发下载;分享走 Web 剪贴板(由调用方处理)。
 * - **Tauri 安卓**：WebView 既不支持 `<a download>` 触发下载,也不支持把图片写进剪贴板
 *   (`navigator.clipboard.write` 的图片 ClipboardItem 在 Android WebView 不可用)。
 *   因此安卓走原生 `tauri-plugin-android-fs`:存到系统相册(MediaStore)+ 系统分享 Intent。
 *
 * 安卓判定复用 {@link isAndroid}(= Tauri + userAgent.Android),桌面/浏览器不受影响。
 */

import { isAndroid } from './platform'

/** 浏览器 / 桌面:用隐藏 <a download> 触发下载。 */
function downloadBlobViaAnchor(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 安卓:把 PNG 写进系统相册 ~/Pictures/FmoDeck/,并通知图库扫描。返回写入文件的 uri。 */
async function writeImageToGallery(blob: Blob, fileName: string) {
  // 动态 import,避免在浏览器/桌面打包路径里实际执行 Tauri 专属代码。
  const { AndroidFs, AndroidPublicImageDir } = await import('tauri-plugin-android-fs-api')

  // Android 10+ 直接返回 true(MediaStore 无需运行时权限);旧系统会弹权限框。
  if (!(await AndroidFs.requestPublicFilesPermission())) {
    throw new Error('Storage permission denied')
  }

  const data = new Uint8Array(await blob.arrayBuffer())
  // isPending:写入期间对其他 App 隐藏,写完再置 false 并扫描,避免图库出现半张图。
  const uri = await AndroidFs.createNewPublicImageFile(
    AndroidPublicImageDir.Pictures,
    `FmoDeck/${fileName}`,
    'image/png',
    { isPending: true }
  )
  try {
    await AndroidFs.writeFile(uri, data)
    await AndroidFs.setPublicFilePending(uri, false)
    await AndroidFs.scanPublicFile(uri)
  } catch (err) {
    await AndroidFs.removeFile(uri).catch(() => undefined)
    throw err
  }
  return uri
}

/**
 * 保存图片。
 * @returns `'native'` 表示已存进安卓相册;`'web'` 表示走了浏览器下载。
 */
export async function saveImage(blob: Blob, fileName: string): Promise<'native' | 'web'> {
  if (isAndroid()) {
    await writeImageToGallery(blob, fileName)
    return 'native'
  }
  downloadBlobViaAnchor(blob, fileName)
  return 'web'
}

/**
 * 分享图片(安卓专用)。先把图片落到相册,再拉起系统分享面板(发微信/QQ/存任意 App)。
 * 安卓没有"把图片复制进剪贴板"的可靠原语,故"复制"在安卓退化为"分享"。
 * @returns `'native'` 表示已拉起分享面板;`'unsupported'` 表示当前环境不支持(非安卓)。
 */
export async function shareImage(blob: Blob, fileName: string): Promise<'native' | 'unsupported'> {
  if (!isAndroid()) return 'unsupported'
  const { AndroidFs } = await import('tauri-plugin-android-fs-api')
  const uri = await writeImageToGallery(blob, fileName)
  await AndroidFs.showShareFileDialog(uri)
  return 'native'
}
