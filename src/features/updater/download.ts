/**
 * 把字节流拼装成完整 buffer,沿途喂进度。
 * abortSignal 触发时抛 AbortError。
 */
export async function downloadWithProgress(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  total: number,
  onProgress: (ratio: number) => void,
  abortSignal?: AbortSignal
): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  let received = 0
  while (true) {
    if (abortSignal?.aborted) {
      throw new Error('aborted')
    }
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    received += value.byteLength
    if (total > 0) onProgress(received / total)
  }
  const out = new Uint8Array(received)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.byteLength
  }
  return out
}

export async function hashSha256(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return bufferToHex(new Uint8Array(buf))
}

export function bufferToHex(bytes: Uint8Array): string {
  let s = ''
  for (const byte of bytes) {
    s += byte.toString(16).padStart(2, '0')
  }
  return s
}

/**
 * 下载 APK 到 Tauri 应用缓存目录，返回绝对路径。
 * 校验失败会删除已写入的文件（如果 plugin-fs 有 remove API，有就用，没就不清理）。
 * 仅在 Tauri Android 环境调用；非 Tauri 会因为 dynamic import 抛错，上层
 * action 应该在调用前判 isAndroid()。
 */
export async function downloadApkToCache(
  url: string,
  expectedSha256: string,
  expectedSize: number,
  onProgress: (ratio: number) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  const { appCacheDir, join } = await import('@tauri-apps/api/path')
  const fs = await import('@tauri-apps/plugin-fs')

  const cacheDir = await appCacheDir()
  try {
    await fs.mkdir(cacheDir, { recursive: true })
  } catch {
    // 已存在时 plugin-fs 会抛错，recursive 理论不抛，但保险吞掉
  }
  const target = await join(cacheDir, 'fmodeck-update.apk')

  // cache: 'no-store' 避开 WebView HTTP 缓存——同一 URL 在不同 workflow
  // 构建之间字节会变(R8 + 重签),缓存会让我们拿到旧字节,sha256 对不上。
  const resp = await fetch(url, {
    cache: 'no-store',
    ...(abortSignal ? { signal: abortSignal } : {})
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`download HTTP ${resp.status}`)
  }
  const reader = resp.body.getReader()
  const data = await downloadWithProgress(reader, expectedSize, onProgress, abortSignal)

  const actualSha = await hashSha256(data)
  if (actualSha !== expectedSha256.toLowerCase()) {
    throw new Error(`sha256 mismatch: expected ${expectedSha256} got ${actualSha}`)
  }

  await fs.writeFile(target, data)
  return target
}
