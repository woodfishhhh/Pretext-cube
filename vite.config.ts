import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 提高分块大小阈值（避免警告）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 启用代码分割，将 @vue/devtools 单独打包
        manualChunks: {
          'vue-devtools': ['@vue/devtools'],
        },
      },
    },
  },
})
