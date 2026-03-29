import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    // Questo plugin carica automaticamente i componenti Vuetify
    vuetify({ autoImport: true }),
  ],
})
