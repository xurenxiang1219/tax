import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false, // 禁用文件级并行，确保测试文件按顺序执行
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
