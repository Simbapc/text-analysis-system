<template>
  <el-card>
    <el-input v-model="inputText" :rows="8" type="textarea" placeholder="请输入要分析的文本" />
    <el-button type="primary" @click="performAnalysis" style="margin-top: 10px;">开始分析</el-button>

    <el-table :data="frequencyData" style="width: 100%; margin-top: 20px;" v-if="frequencyData.length > 0">
      <el-table-column prop="word" label="词语" />
      <el-table-column prop="count" label="频率" />
    </el-table>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const inputText = ref('');
const frequencyData = ref([]);

const performAnalysis = async () => {
  if (!inputText.value.trim()) return;
  try {
    const response = await axios.post('http://localhost:3000/api/analyze', {
      text: inputText.value
    });
    // 将 {word: count, ...} 格式转换为 [{word: 'word', count: 'count'}, ...]
    frequencyData.value = Object.entries(response.data.frequency).map(([word, count]) => ({ word, count}));
    
  } catch (error) {
    console.error('分析失败:', error);
  }
};
</script>

export default {
  name: 'AnalysisComponent'
};