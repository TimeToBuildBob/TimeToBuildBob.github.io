import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // The live demo is deployed under /demos/fantasy-rpg/ on the website repo.
  // Keep dev simple at root, but emit subdir-safe asset URLs for production.
  base: command === 'build' ? '/demos/fantasy-rpg/' : '/',
}))
