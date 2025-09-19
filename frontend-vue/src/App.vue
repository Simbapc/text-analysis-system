<template>
  <div id="app">
    <h1>文本分析系统 - 服务状态检查</h1>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(true);
const nodeStatus = ref('未知');
const pythonStatus = ref('未知');
const nodeStatusClass = ref('');
const pythonStatusClass = ref('');
const errorMessage = ref('');

// 定义检查服务状态的函数
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

// 在组件挂载后（即页面加载时）立即执行检查
onMounted(() => {
  checkServiceHealth();
});
</script>

<style>
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
.status-ok { color: green; }
.status-error { color: red; }
.error-message { color: darkred; font-size: 0.9em; }
</style>