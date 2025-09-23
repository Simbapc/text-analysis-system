import { createApp } from 'vue'
import App from './App.vue'

// ✅ 引入 Element Plus 及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 创建应用实例
const app = createApp(App)

// ✅ 安装 Element Plus 插件（自动注册所有组件，如 el-input, el-button 等）
app.use(ElementPlus)
// 挂载到 #app
app.mount('#app')
