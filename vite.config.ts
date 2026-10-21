import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Relative base so the build works at any path (e.g. https://<user>.github.io/echokiz/).
  base: './',
  server: {
    // Allows access from other devices in the network / via tunnel (e.g. Cloudflare Tunnel).
    host: true,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
