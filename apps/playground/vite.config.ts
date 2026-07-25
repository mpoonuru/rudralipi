import { default as tailwindcss } from '@tailwindcss/vite'
import { default as react } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
