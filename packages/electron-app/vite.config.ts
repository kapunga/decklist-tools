import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              // Only 'electron' is external — it is provided by the runtime.
              // Everything else (incl. 'archiver') is bundled INTO main.js so
              // the packaged app never depends on node_modules being present.
              // electron-builder's dependency collector can't resolve this
              // pnpm workspace, so externalised modules go missing in the
              // packaged build (see v0.12.0: "Cannot find module 'archiver'").
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
