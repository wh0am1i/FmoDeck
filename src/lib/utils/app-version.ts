/**
 * 应用版本号。直接从 package.json 的 version 字段读取。
 * Vite 支持 JSON import,tsconfig 需开 resolveJsonModule。
 */
import pkg from '../../../package.json'
export const APP_VERSION: string = pkg.version
