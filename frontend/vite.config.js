import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker 里前端和后端是两个容器，前端容器里的 localhost:8000 是它自己，
// 后端在 http://backend:8000（compose 的服务名）。本机不用 Docker 开发时
// 保持默认 localhost:8000。compose 里用 VITE_PROXY_TARGET 注入。
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': proxyTarget,
      '/uploads': proxyTarget,
    },
  },
})
