import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  define: {
    'process.env': {},
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Externalize Midnight server-side packages that can't run in the browser
      external: [
        '@midnight-ntwrk/ledger',
        '@midnight-ntwrk/onchain-runtime',
        '@midnight-ntwrk/onchain-runtime-v2',
        '@midnight-ntwrk/midnight-js-network-id',
      ],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
