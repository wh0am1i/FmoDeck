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
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0')
  }
  return s
}
