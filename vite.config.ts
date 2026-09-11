import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative assets work on both repository Pages URLs and custom domains.
  base: './',
  plugins: [react(), tailwindcss()],
})
