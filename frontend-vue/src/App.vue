<template>
  <div id="app">
    <header>
      <h1>文本分析系统</h1>
    </header>
    <main>
      <AnalysisComponent />
    </main>
  </div>
</template>
<script setup>
// './components/AnalysisComponent.vue' 是相对于 App.vue 的路径
import AnalysisComponent from './components/AnalysisComponent.vue';
</script>

<style>
/* 添加一些全局样式让页面更好看 */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f4f5f7;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

header {
  width: 100%;
  background-color: #ffffff;
  padding: 20px 0;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 2rem;
}

header h1 {
  color: #2c3e50;
  margin: 0;
}

main {
  width: 100%;
  max-width: 800px;
  /* 限制内容区域的最大宽度 */
  padding: 0 20px;
}
</style>

<!-- test running -->
<!-- <template>
  <div class="status-card">
    <p>正在检查后端服务状态...</p>
    <div v-if="loading">
      <p>加载中...</p>
    </div>
    <div v-else>
      <p :class="nodeStatusClass">Node.js 服务状态: <strong>{{ nodeStatus }}</strong></p>
      <p :class="pythonStatusClass">Python NLP 服务状态: <strong>{{ pythonStatus }}</strong></p>
      <p v-if="errorMessage" class="error-message">错误信息: {{ errorMessage }}</p>
    </div>
  </div>

</template> -->



<!-- <script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(true);
const nodeStatus = ref('未知');
const pythonStatus = ref('未知');
const nodeStatusClass = ref('');
const pythonStatusClass = ref('');
const errorMessage = ref('');

let pollingInterval = null; // 存储轮询定时器

定义检查服务状态的函数
const checkServiceHealth = async () => {
  try {
    // 请求 Node.js 后端的健康检查接口
    const response = await axios.get('http://localhost:3000/api/health');
    const data = response.data;

    if (data.status === 'ok') {
      nodeStatus.value = data.services.node;
      pythonStatus.value = data.services.python;

      nodeStatusClass.value = 'status-ok';
      pythonStatusClass.value = data.services.python === 'running' ? 'status-ok' : 'status-error';
    }
  } catch (error) {
    console.error('无法连接到后端服务:', error);
    nodeStatus.value = '无法访问';
    pythonStatus.value = '无法访问';
    nodeStatusClass.value = 'status-error';
    pythonStatusClass.value = 'status-error';
    errorMessage.value = '请确保 Node.js 后端服务已在 http://localhost:3000 上运行。';
  } finally {
    loading.value = false;
  }
};

启动轮询（每 10 秒检查一次）
const startPolling = () => {
  checkServiceHealth(); // 立即执行一次
  pollingInterval = setInterval(checkServiceHealth, 10000); // 每 10 秒轮询一次
};

在组件挂载后（即页面加载时）立即执行检查
onMounted(() => {
  checkServiceHealth();
});

组件卸载前清除定时器，防止内存泄漏
onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
});

</script> -->

<!-- <style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.status-card {
  border: 1px solid #ccc;
  padding: 20px;
  margin: 20px auto;
  max-width: 400px;
  border-radius: 8px;
}

.status-ok {
  color: green;
}

.status-error {
  color: red;
}

.error-message {
  color: darkred;
  font-size: 0.9em;
}
</style> -->
