import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // jsdom gives us localStorage (save module) and a DOM for Phaser to import
    // against without booting a real game canvas.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
