import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/pretext/',
  plugins: [vue()],
  build: {
    // 提高分块大小阈值（避免警告）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown 这里要求使用函数形式
        manualChunks(id) {
          if (id.includes('@vue/devtools')) {
            return 'vue-devtools'
          }
        },
      },
    },
  },
})
