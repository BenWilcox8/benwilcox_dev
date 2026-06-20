import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Emulator-backed security-rules tests run in their own config
    // (vitest.rules.config.ts) via `npm run test:rules`.
    exclude: ['**/node_modules/**', '**/dist/**', 'test/rules/**'],
  },
})
