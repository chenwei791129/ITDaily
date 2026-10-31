import { defineConfig } from 'vite'

// `bun run dev` serves the UI; run `bun run start` alongside it for /api.
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:8080' } },
})
