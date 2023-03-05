import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { VitePWA } from 'vite-plugin-pwa'


// console.log(process.env)
// console.log(process.env.BUILD_PLATFORM)
// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BUILD_PLATFORM === 'GH' ? '/txt-reader/' : '/',
  plugins: [vue(), vueJsx(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'txt阅读器',
      short_name: 'txt阅读器',
      description: 'TXT在线阅读器',
      theme_color: '#ffffff',
      icons: [
        {
          src: 'logo.png',
          sizes: '192x166',
          type: 'image/png'
        }
      ]
    }
  })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
