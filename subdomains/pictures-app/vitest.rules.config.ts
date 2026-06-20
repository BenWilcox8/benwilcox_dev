import { defineConfig } from 'vitest/config'

// Emulator-backed security-rules tests. Run via `npm run test:rules`, which
// wraps this in `firebase emulators:exec` so the Firestore/Storage emulators
// are live. Kept separate from the default vitest project (no jsdom, no React
// setup) so the normal `npm test` suite stays emulator/Java-free.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/rules/**/*.test.ts'],
  },
})
