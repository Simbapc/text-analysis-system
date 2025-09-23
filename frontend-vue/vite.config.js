// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8080, // 前端开发端口
    open: true, // 启动时自动打开浏览器
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 后端 Node.js 服务地址
        changeOrigin: true,              // 支持跨域
        secure: false,                   // 不验证 HTTPS 证书
        // rewrite: (path) => path.replace(/^\/api/, '/api') // 可选：路径重写
      }
    }
  }
});