<template>
  <el-row :gutter="20">
    <el-col :span="16">
      <el-card>
        <template #header>文本内容</template>
        <el-input v-model="inputText" :rows="8" type="textarea" placeholder="请输入要分析的文本，建议内容稍长一些以获得更好的相关性分析效果。" />
        <el-button type="primary" @click="performAnalysis" style="margin-top: 10px;" :loading="loading">
          开始分析
        </el-button>
      </el-card>

      <el-card style="margin-top: 20px;" v-if="analysisResult.keywords.length > 0">
        <template #header>核心关键词</template>
        <el-tag v-for="keyword in analysisResult.keywords" :key="keyword" type="success"
          style="margin-right: 10px; margin-bottom: 10px;">
          {{ keyword }}
        </el-tag>
      </el-card>

      <el-card style="margin-top: 20px;" v-if="correlationResult.source_word">
        <template #header>
          与 "<b>{{ correlationResult.source_word }}</b>" 最相关的词
        </template>
        <el-table :data="formattedCorrelation" stripe>
          <el-table-column prop="word" label="相关词" />
          <el-table-column prop="similarity" label="相关度">
            <template #default="scope">
              <el-progress :percentage="scope.row.similarity" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>

    </el-col>

    <el-col :span="8">
      <el-card>
        <template #header>分析结果</template>
        <div v-if="analysisResult.frequency.length > 0">
          <p>情感倾向积极度: {{ (analysisResult.sentiment * 100).toFixed(2) }}%</p>
          <el-progress :percentage="parseFloat((analysisResult.sentiment * 100).toFixed(2))" />
          <p style="margin-top: 20px;"><b>词频统计 (点击词语分析相关性)</b></p>
          <el-table :data="analysisResult.frequency" style="width: 100%; cursor: pointer;" height="400"
            @row-click="handleWordClick">
            <el-table-column prop="word" label="词语" />
            <el-table-column prop="count" label="频率" sortable />
          </el-table>
        </div>
        <el-empty v-else description="暂无分析结果" />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const inputText = ref('机器学习和深度学习是人工智能的两个重要分支。机器学习算法通过学习数据中的模式来进行预测，而深度学习则使用深度神经网络结构。学习这些技术对于理解现代AI至关重要。');
const loading = ref(false);

// 使用 reactive 来组织分析结果
const analysisResult = reactive({
  words: [],
  frequency: [],
  sentiment: 0,
  keywords: [],
});

const correlationResult = reactive({
  source_word: '',
  similar_words: []
});

// 主分析函数
const performAnalysis = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning('请输入要分析的文本');
    return;
  }
  loading.value = true;
  // 清空上一次的相关性结果
  correlationResult.source_word = '';
  correlationResult.similar_words = [];
  try {
    const response = await axios.post('http://localhost:3000/api/analyze', {
      text: inputText.value
    });
    // 更新分析结果
    analysisResult.words = response.data.words;
    analysisResult.frequency = Object.entries(response.data.frequency).map(([word, count]) => ({ word, count }));
    analysisResult.sentiment = response.data.sentiment;
    analysisResult.keywords = response.data.keywords; // 保存关键词
  } catch (error) {
    ElMessage.error('分析失败，请检查后端服务是否正常。');
    console.error('分析失败:', error);
  } finally {
    loading.value = false;
  }
};

// 【新增】处理词语点击事件，获取相关性
const handleWordClick = async (row) => {
  const targetWord = row.word;
  ElMessage.info(`正在分析与 "${targetWord}" 相关的词...`);
  try {
    const response = await axios.post('http://localhost:3000/api/correlation', {
      words: analysisResult.words, // 传递完整的分词列表
      target_word: targetWord
    });

    
    // 更新相关性结果
    correlationResult.source_word = response.data.source_word;
    correlationResult.similar_words = response.data.similar_words;
  } catch (error) {
    const errorMsg = error.response?.data?.error || '获取相关性失败';
    ElMessage.error(errorMsg);
    console.error('获取相关性失败:', error);
  }
};



// 计算属性，用于格式化相关性数据以适配表格和进度条
const formattedCorrelation = computed(() => {
  return correlationResult.similar_words.map(([word, similarity]) => ({
    word,
    similarity: parseFloat((similarity * 100).toFixed(2))
  }));
});
</script>

<style scoped>
/* scoped 样式只作用于当前组件 */
b {
  color: #409EFF;
}
</style>

export default {
name: 'AnalysisComponent'
};