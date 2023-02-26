import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// console.log(process.env)
console.log(process.env.BUILD_PLATFORM)
// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BUILD_PLATFORM === 'GH' ? '/txt-reader/' : '/',
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
