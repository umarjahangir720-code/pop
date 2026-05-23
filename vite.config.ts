import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // In production we use VITE_BACKEND_URL to point frontend to the deployed backend.
  // The local dev proxy is intentionally disabled here so production builds don't
  // accidentally depend on localhost.
})
