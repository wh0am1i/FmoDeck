import initSqlJs, { type SqlJsStatic } from 'sql.js'

let cached: Promise<SqlJsStatic> | null = null

function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined
}

export function loadSql(): Promise<SqlJsStatic> {
  if (cached) return cached

  cached = (async () => {
    if (isNode()) {
      // Node/Vitest: 通过 createRequire 解析 node_modules 下的 wasm 路径，
      // 再用 fs 读字节喂给 initSqlJs，避免依赖 import.meta.url 的 scheme
      const { readFile } = await import('node:fs/promises')
      const { createRequire } = await import('node:module')
      const require = createRequire(process.cwd() + '/')
      const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
      const buf = await readFile(wasmPath)
      const wasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      return initSqlJs({ wasmBinary })
    }
    // Browser (Vite build): 通过 ?url 静态资产导入本地 wasm，不走 CDN
    const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default
    return initSqlJs({ locateFile: () => wasmUrl })
  })()

  return cached
}
