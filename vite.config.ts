import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint .',
        useFlatConfig: true
      },
      overlay: { initialIsOpen: false }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
