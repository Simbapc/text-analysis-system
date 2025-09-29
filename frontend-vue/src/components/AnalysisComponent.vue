<template>
  <el-row :gutter="20">
    <el-col :span="16">
      <el-card>
        <template #header>文本内容</template>
        <el-input v-model="inputText" :rows="8" type="textarea" placeholder="请输入要分析的文本，建议内容稍长一些以获得更好的相关性分析效果。" />

        <div class="action-buttons">
          <el-button type="primary" @click="performAnalysis" style="margin-top: 10px;" :loading="loading">
            1. 开始分析
          </el-button>
          <el-button type="success" @click="getCoWordNetwork" style="margin-top: 10px;" :loading="networkLoading"
            :disabled="!analysisResult.words.length">
            2. 生成共词网络图
          </el-button>
          <div class="topic-action">
            <el-input-number v-model="numTopics" :min="2" :max="10" size="small" controls-position="right"
              style="width: 120px;" />
            <el-button type="warning" @click="getTopics" :loading="topicsLoading" :disabled="!inputText.trim()">
              3. 提取 {{ numTopics }} 个主题
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card style="margin-top: 20px;" v-loading="topicsLoading">
        <template #header>主题模型分析 (LDA)</template>
        <div v-if="topicsData && topicsData.length > 0">
          <el-collapse v-model="activeTopicNames">
            <el-collapse-item v-for="topic in topicsData" :key="topic.topicId" :title="'主题 ' + (topic.topicId + 1)"
              :name="topic.topicId">
              <div>
                <el-tag v-for="word in topic.words" :key="word.term" style="margin: 4px;">
                  {{ word.term }}
                  <span class="topic-weight">({{ (word.weight * 100).toFixed(2) }}%)</span>
                </el-tag>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <el-empty v-else description="请先进行基础分析，然后点击“提取主题”按钮" />
      </el-card>

      <el-card style="margin-top: 20px;" v-loading="networkLoading">
        <template #header>核心词共现网络分析</template>
        <NetworkGraph v-if="networkData" :graphData="networkData" />
        <el-empty v-else description="请先进行基础分析，然后点击“生成共词网络图”按钮" />
      </el-card>
    </el-col>

    <el-col :span="8">
      <el-card>
        <template #header>分析结果</template>
        <div v-if="analysisResult.frequency.length > 0">
          <p><b>核心关键词</b></p>
          <el-tag v-for="keyword in analysisResult.keywords" :key="keyword" type="success"
            style="margin-right: 5px; margin-bottom: 5px;">
            {{ keyword }}
          </el-tag>
          <el-divider />
          <p><b>词频统计 (点击词语分析相关性)</b></p>
          <el-table :data="analysisResult.frequency" style="width: 100%; cursor: pointer;" height="300"
            @row-click="handleWordClick">
            <el-table-column prop="word" label="词语" />
            <el-table-column prop="count" label="频率" sortable />
          </el-table>
        </div>
        <el-empty v-else description="暂无分析结果" />
      </el-card>

      <el-card style="margin-top: 20px;" v-if="nerResult.entities.length > 0">
        <template #header>实体识别结果</template>
        <div class="entity-container">
          <el-tag v-for="entity in nerResult.entities" :key="entity.text" :type="getEntityType(entity.label)"
            style="margin-right: 10px; margin-bottom: 10px;" class="entity-tag">
            {{ entity.text }}<small>({{ entity.label }})</small>
          </el-tag>
        </div>
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

    <!-- <el-col :span="8">
      <el-card style="margin-top: 20px;" v-if="analysisResult.keywords.length > 0">
        <template #header>核心关键词</template>
        <el-tag v-for="keyword in analysisResult.keywords" :key="keyword" type="success"
          style="margin-right: 10px; margin-bottom: 10px;">
          {{ keyword }}
        </el-tag>
      </el-card>

      <el-card style="margin-top: 20px;" v-if="nerResult.entities.length > 0">
        <template #header>实体识别结果</template>
        <div class="entity-container">
          <el-tag v-for="entity in nerResult.entities" :key="entity.text" :type="getEntityType(entity.label)"
            style="margin-right: 10px; margin-bottom: 10px;" class="entity-tag">
            {{ entity.text }}<small>({{ entity.label }})</small>
          </el-tag>
        </div>
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
    </el-col> -->
  </el-row>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import NetworkGraph from './NetworkGraph.vue';
// const inputText = ref('机器学习和深度学习是人工智能的两个重要分支。机器学习算法通过学习数据中的模式来进行预测，而深度学习则使用深度神经网络结构。学习这些技术对于理解现代AI至关重要。');
const inputText = ref('自动驾驶技术是未来交通的核心。它依赖于多种传感器，如激光雷达、摄像头和毫米波雷达，来感知周围环境。这些传感器收集的大量数据通过复杂的算法进行处理，其中深度学习模型扮演了关键角色。车辆的安全性是自动驾驶技术最重要的考量，需要进行大量的模拟和实际道路测试来确保系统的可靠性。此外，相关的法律法规也是推动技术落地的重要因素。');
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

const nerResult = reactive({
  entities: []
});

// 【新增】用于存储网络图数据和加载状态的 ref
const networkData = ref(null);
const networkLoading = ref(false);

// 【修改】主题模型相关的 ref
const topicsLoading = ref(false);
const numTopics = ref(3);
const topicsData = ref(null); // 【简化】不再需要 rawTopicsData，直接用 topicsData
const activeTopicNames = ref([]);

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
  // 清空上一次的实体识别结果
  nerResult.entities = [];
  try {
    const response = await axios.post('http://localhost:3000/api/analyze', {
      text: inputText.value
    });
    // 更新分析结果
    analysisResult.words = response.data.words;
    analysisResult.frequency = Object.entries(response.data.frequency).map(([word, count]) => ({ word, count }));
    analysisResult.sentiment = response.data.sentiment;
    analysisResult.keywords = response.data.keywords; // 保存关键词

    // 实体识别
    try {
      const nerResponse = await axios.post('http://localhost:3000/api/ner', {
        text: inputText.value
      });
      nerResult.entities = nerResponse.data.entities; // 保存实体识别结果
      if (nerResult.entities.length > 0) {
        ElMessage.success(`识别到 ${nerResult.entities.length} 个实体`);
      }
    } catch (nerError) {
      console.warn('实体识别失败:', nerError);
      // 实体识别失败不影响其他分析结果的显示
    }

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

// 【新增】获取并处理共词网络数据的函数
const getCoWordNetwork = async () => {
  if (!analysisResult.words.length) {
    ElMessage.warning('请先执行“开始分析”以获取文本分词结果。');
    return;
  }
  networkLoading.value = true;
  networkData.value = null; // 先清空，触发 v-if 重新渲染
  try {
    const response = await axios.post('http://localhost:3000/api/co-word-network', {
      words: analysisResult.words
    });
    // 将获取到的数据赋值给 networkData，这将自动通过 prop 传递给 NetworkGraph 组件
    networkData.value = response.data;
  } catch (error) {
    ElMessage.error('生成共词网络失败，请检查后端服务。');
    console.error('网络图生成失败:', error);
  } finally {
    networkLoading.value = false;
  }
};



// 【新增】获取并处理主题模型的函数
const getTopics = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning('请输入文本以进行主题分析。');
    return;
  }
  topicsLoading.value = true;
  topicsData.value = null; // 清空旧数据
  try {
    const response = await axios.post('http://localhost:3000/api/topics', {
      text: inputText.value,
      num_topics: Number(numTopics.value) // 将用户选择的主题数发送给后端
    });
    console.log('numTopics.value:', numTopics.value);
    // 【简化】直接赋值，不再需要任何解析！
    topicsData.value = response.data.topics;
    // 默认展开所有折叠项
    activeTopicNames.value = response.data.topics.map(t => t.topicId);
  } catch (error) {
    ElMessage.error('提取主题失败，请检查后端服务。');
    console.error('主题提取失败:', error);
  } finally {
    topicsLoading.value = false;
  }
};

// 根据实体标签获取对应的标签类型
const getEntityType = (label) => {
  const typeMap = {
    'PERSON': 'primary',    // 人名 - 蓝色
    'GPE': 'success',       // 地名 - 绿色
    'ORG': 'warning',       // 组织 - 橙色
    'DATE': 'info',         // 日期 - 青色
    'TIME': 'info',         // 时间 - 青色
    'MONEY': 'danger',      // 金额 - 红色
    'PERCENT': 'danger',    // 百分比 - 红色
    'CARDINAL': '',         // 基数 - 默认
    'ORDINAL': '',          // 序数 - 默认
    'QUANTITY': '',         // 数量 - 默认
    'EVENT': 'warning',     // 事件 - 橙色
    'WORK_OF_ART': 'info',  // 作品 - 青色
    'LAW': 'warning',       // 法律 - 橙色
    'LANGUAGE': 'info',     // 语言 - 青色
    'NORP': 'success',      // 民族/宗教/政治团体 - 绿色
    'FAC': 'info',          // 设施 - 青色
    'PRODUCT': 'warning',   // 产品 - 橙色
    'LOC': 'success',       // 位置 - 绿色
  };
  return typeMap[label] || '';
};
</script>

<style scoped>
/* scoped 样式只作用于当前组件 */
b {
  color: #409EFF;
}

.entity-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.entity-tag {
  transition: all 0.3s ease;
  cursor: pointer;
}

.entity-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.entity-tag small {
  margin-left: 4px;
  opacity: 0.8;
  font-size: 0.8em;
}

.action-buttons {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.action-buttons>.el-button {
  margin-right: 10px;
  margin-bottom: 10px;
}

.topic-action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.topic-weight {
  color: #909399;
  font-size: 0.8em;
  margin-left: 4px;
}
</style>
