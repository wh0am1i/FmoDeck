/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_APRS?: string
  readonly VITE_AMAP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.wasm?url' {
  const src: string
  export default src
}
