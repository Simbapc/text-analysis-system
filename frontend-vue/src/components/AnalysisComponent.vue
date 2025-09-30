<template>
  <el-row :gutter="20">
    <el-col :span="16">
      <!-- 文本输入区域 -->
      <el-card class="input-section">
        <template #header>
          <div class="card-header">
            <span>文本内容</span>
            <el-tooltip content="建议输入较长的文本以获得更准确的分析结果" placement="top">
              <el-icon><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
        <el-input 
          v-model="inputText" 
          :rows="8" 
          type="textarea" 
          placeholder="请输入要分析的文本，建议内容稍长一些以获得更好的相关性分析效果。"
          resize="none"
          show-word-limit
          :maxlength="5000"
        />
        
        <div class="action-buttons">
          <el-button 
            type="primary" 
            @click="performAnalysis" 
            :loading="loading"
            size="large"
            class="primary-action"
          >
            <el-icon><Search /></el-icon>
            开始分析
          </el-button>
          
          <div class="secondary-actions">
            <el-button 
              type="success" 
              @click="getCoWordNetwork" 
              :loading="networkLoading"
              :disabled="!analysisResult.words.length"
              size="default"
            >
              <el-icon><Connection /></el-icon>
              生成共词网络图
            </el-button>
            
            <div class="topic-action">
              <el-input-number 
                v-model="numTopics" 
                :min="2" 
                :max="10" 
                size="small" 
                controls-position="right"
                style="width: 120px" 
              />
              <el-button 
                type="warning" 
                @click="getTopics" 
                :loading="topicsLoading" 
                :disabled="!inputText.trim()"
                size="default"
              >
                <el-icon><Collection /></el-icon>
                提取 {{ numTopics }} 个主题
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 实体识别结果 -->
      <el-card class="result-section" v-if="nerResult.entities.length > 0">
        <template #header>
          <div class="card-header">
            <span>实体识别结果</span>
            <el-tag type="info" size="small">{{ nerResult.entities.length }} 个实体</el-tag>
          </div>
        </template>
        <div class="entity-container">
          <el-tag 
            v-for="entity in nerResult.entities" 
            :key="entity.text" 
            :type="getEntityType(entity.label)"
            class="entity-tag"
            effect="light"
          >
            {{ entity.text }}<small>({{ entity.label }})</small>
          </el-tag>
        </div>
      </el-card>

      <!-- 主题模型分析 -->
      <el-card class="result-section" v-loading="topicsLoading">
        <template #header>
          <div class="card-header">
            <span>主题模型分析 (LDA)</span>
            <el-tag v-if="topicsData" type="info" size="small">{{ topicsData.length }} 个主题</el-tag>
          </div>
        </template>
        <div v-if="topicsData && topicsData.length > 0">
          <el-collapse v-model="activeTopicNames" accordion>
            <el-collapse-item 
              v-for="topic in topicsData" 
              :key="topic.topicId" 
              :title="`主题 ${topic.topicId + 1}`"
              :name="topic.topicId"
            >
              <div class="topic-words">
                <el-tag 
                  v-for="word in topic.words" 
                  :key="word.term" 
                  class="topic-word-tag"
                  effect="plain"
                >
                  {{ word.term }}
                  <span class="topic-weight">({{ (word.weight * 100).toFixed(2) }}%)</span>
                </el-tag>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <el-empty v-else description="请先进行基础分析，然后点击“提取主题”按钮" />
      </el-card>

      <!-- 共词网络分析 -->
      <el-card class="result-section" v-loading="networkLoading">
        <template #header>
          <div class="card-header">
            <span>核心词共现网络分析</span>
            <el-tag v-if="networkData" type="info" size="small">{{ networkData.nodes.length }} 个节点</el-tag>
          </div>
        </template>
        <NetworkGraph v-if="networkData" :graphData="networkData" />
        <el-empty v-else description="请先进行基础分析，然后点击“生成共词网络图”按钮" />
      </el-card>
    </el-col>

    <el-col :span="8">
      <!-- 分析结果概览 -->
      <el-card class="result-section">
        <template #header>
          <div class="card-header">
            <span>分析结果</span>
            <el-tag v-if="analysisResult.frequency.length > 0" type="info" size="small">
              {{ analysisResult.frequency.length }} 个词语
            </el-tag>
          </div>
        </template>
        <div v-if="analysisResult.frequency.length > 0">
          <div class="keywords-section">
            <p class="section-title"><el-icon><Star /></el-icon> 核心关键词</p>
            <div class="keywords-container">
              <el-tag 
                v-for="keyword in analysisResult.keywords" 
                :key="keyword" 
                type="success"
                class="keyword-tag"
                effect="light"
              >
                {{ keyword }}
              </el-tag>
            </div>
          </div>
          
          <el-divider />
          
          <div class="frequency-section">
            <p class="section-title"><el-icon><TrendCharts /></el-icon> 词频统计</p>
            <p class="section-subtitle">点击词语分析相关性</p>
            <el-table 
              :data="analysisResult.frequency" 
              class="frequency-table" 
              height="300" 
              @row-click="handleWordClick"
              stripe
            >
              <el-table-column prop="word" label="词语" width="120">
                <template #default="scope">
                  <span class="word-cell">{{ scope.row.word }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="count" label="频率" sortable width="80">
                <template #default="scope">
                  <el-tag size="small" type="info">{{ scope.row.count }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-empty v-else description="暂无分析结果" />
      </el-card>

      <!-- 相关性分析结果 -->
      <el-card class="result-section" v-if="correlationResult.source_word">
        <template #header>
          <div class="card-header">
            <span>相关性分析</span>
            <el-tag type="info" size="small">{{ formattedCorrelation.length }} 个相关词</el-tag>
          </div>
        </template>
        <div class="correlation-header">
          与 "<span class="source-word">{{ correlationResult.source_word }}</span>" 最相关的词
        </div>
        <el-table :data="formattedCorrelation" class="correlation-table" stripe>
          <el-table-column prop="word" label="相关词" width="120">
            <template #default="scope">
              <span class="correlation-word">{{ scope.row.word }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="similarity" label="相关度" width="80">
            <template #default="scope">
              <div class="">
                <el-progress 
                  :percentage="scope.row.similarity" 
                  :color="getSimilarityColor(scope.row.similarity)"
                  :show-text="false"
                />
                <span class="similarity-text">{{ scope.row.similarity.toFixed(1) }}%</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import NetworkGraph from "./NetworkGraph.vue";
import { 
  InfoFilled, 
  Search, 
  Connection, 
  Collection, 
  Star, 
  TrendCharts 
} from '@element-plus/icons-vue';
// const inputText = ref('机器学习和深度学习是人工智能的两个重要分支。机器学习算法通过学习数据中的模式来进行预测，而深度学习则使用深度神经网络结构。学习这些技术对于理解现代AI至关重要。');
const inputText = ref("");
const loading = ref(false);

// 使用 reactive 来组织分析结果
const analysisResult = reactive({
  words: [],
  frequency: [],
  sentiment: 0,
  keywords: [],
});

const correlationResult = reactive({
  source_word: "",
  similar_words: [],
});

const nerResult = reactive({
  entities: [],
});

// 用于存储网络图数据和加载状态的 ref
const networkData = ref(null);
const networkLoading = ref(false);

// 主题模型相关的 ref
const topicsLoading = ref(false);
const numTopics = ref(3);
const topicsData = ref(null); // 【简化】不再需要 rawTopicsData，直接用 topicsData
const activeTopicNames = ref([]);

// 主分析函数
const performAnalysis = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning("请输入要分析的文本");
    return;
  }
  loading.value = true;
  // 清空上一次的相关性结果
  correlationResult.source_word = "";
  correlationResult.similar_words = [];
  // 清空上一次的实体识别结果
  nerResult.entities = [];
  try {
    const response = await axios.post("http://localhost:3000/api/analyze", {
      text: inputText.value,
    });
    // 更新分析结果
    analysisResult.words = response.data.words;
    analysisResult.frequency = Object.entries(response.data.frequency).map(
      ([word, count]) => ({ word, count })
    );
    analysisResult.sentiment = response.data.sentiment;
    analysisResult.keywords = response.data.keywords; // 保存关键词

    // 实体识别
    try {
      const nerResponse = await axios.post("http://localhost:3000/api/ner", {
        text: inputText.value,
      });
      nerResult.entities = nerResponse.data.entities; // 保存实体识别结果
      if (nerResult.entities.length > 0) {
        ElMessage.success(`识别到 ${nerResult.entities.length} 个实体`);
      }
    } catch (nerError) {
      console.warn("实体识别失败:", nerError);
      // 实体识别失败不影响其他分析结果的显示
    }
  } catch (error) {
    ElMessage.error("分析失败，请检查后端服务是否正常。");
    console.error("分析失败:", error);
  } finally {
    loading.value = false;
  }
};

// 【新增】处理词语点击事件，获取相关性
const handleWordClick = async (row) => {
  const targetWord = row.word;
  ElMessage.info(`正在分析与 "${targetWord}" 相关的词...`);
  try {
    const response = await axios.post("http://localhost:3000/api/correlation", {
      words: analysisResult.words, // 传递完整的分词列表
      target_word: targetWord,
    });

    // 更新相关性结果
    correlationResult.source_word = response.data.source_word;
    correlationResult.similar_words = response.data.similar_words;
  } catch (error) {
    const errorMsg = error.response?.data?.error || "获取相关性失败";
    ElMessage.error(errorMsg);
    console.error("获取相关性失败:", error);
  }
};

// 计算属性，用于格式化相关性数据以适配表格和进度条
const formattedCorrelation = computed(() => {
  return correlationResult.similar_words.map(([word, similarity]) => ({
    word,
    similarity: parseFloat((similarity * 100).toFixed(2)),
  }));
});

// 【新增】获取并处理共词网络数据的函数
const getCoWordNetwork = async () => {
  if (!analysisResult.words.length) {
    ElMessage.warning("请先执行“开始分析”以获取文本分词结果。");
    return;
  }
  networkLoading.value = true;
  networkData.value = null; // 先清空，触发 v-if 重新渲染
  try {
    const response = await axios.post(
      "http://localhost:3000/api/co-word-network",
      {
        words: analysisResult.words,
      }
    );
    // 将获取到的数据赋值给 networkData，这将自动通过 prop 传递给 NetworkGraph 组件
    networkData.value = response.data;
  } catch (error) {
    ElMessage.error("生成共词网络失败，请检查后端服务。");
    console.error("网络图生成失败:", error);
  } finally {
    networkLoading.value = false;
  }
};

// 【新增】获取并处理主题模型的函数
const getTopics = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning("请输入文本以进行主题分析。");
    return;
  }
  topicsLoading.value = true;
  topicsData.value = null; // 清空旧数据
  try {
    const response = await axios.post("http://localhost:3000/api/topics", {
      text: inputText.value,
      num_topics: numTopics.value, // 将用户选择的主题数发送给后端
    });
    console.log("numTopics.value:", numTopics.value);
    // 【简化】直接赋值，不再需要任何解析！
    topicsData.value = response.data.topics;
    // 默认展开所有折叠项
    activeTopicNames.value = response.data.topics.map((t) => t.topicId);
  } catch (error) {
    ElMessage.error("提取主题失败，请检查后端服务。");
    console.error("主题提取失败:", error);
  } finally {
    topicsLoading.value = false;
  }
};

// 根据实体标签获取对应的标签类型
const getEntityType = (label) => {
  const typeMap = {
    PERSON: "primary", // 人名 - 蓝色
    GPE: "success", // 地名 - 绿色
    ORG: "warning", // 组织 - 橙色
    DATE: "info", // 日期 - 青色
    TIME: "info", // 时间 - 青色
    MONEY: "danger", // 金额 - 红色
    PERCENT: "danger", // 百分比 - 红色
    CARDINAL: "info", // 基数 - 青色
    ORDINAL: "info", // 序数 - 青色
    QUANTITY: "info", // 数量 - 青色
    EVENT: "warning", // 事件 - 橙色
    WORK_OF_ART: "success", // 作品 - 绿色
    LAW: "danger", // 法律 - 红色
    LANGUAGE: "primary", // 语言 - 蓝色
    NORP: "success", // 民族/宗教/政治团体 - 绿色
    FAC: "info", // 设施 - 青色
    PRODUCT: "warning", // 产品 - 橙色
    LOC: "success", // 位置 - 绿色
  };
  return typeMap[label] || "info"; // 默认使用青色
};

// 根据相似度获取进度条颜色
const getSimilarityColor = (similarity) => {
  if (similarity >= 80) return '#67c23a';
  if (similarity >= 60) return '#e6a23c';
  if (similarity >= 40) return '#409eff';
  return '#f56c6c';
};
</script>

<style scoped>
/* 通用样式 */
b {
  color: #409eff;
}

/* 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 输入区域样式 */
.input-section {
  margin-bottom: 20px;
}

/* 结果区域样式 */
.result-section {
  margin-top: 20px;
}

/* 按钮区域样式 */
.action-buttons {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.primary-action {
  width: 100%;
  margin-bottom: 10px;
}

.secondary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.topic-action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

/* 实体识别样式 */
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

/* 主题模型样式 */
.topic-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.topic-word-tag {
  transition: all 0.3s ease;
}

.topic-word-tag:hover {
  transform: scale(1.05);
}

.topic-weight {
  color: #909399;
  font-size: 0.8em;
  margin-left: 4px;
}

/* 分析结果样式 */
.section-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-subtitle {
  color: #909399;
  font-size: 0.85em;
  margin-bottom: 12px;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.keyword-tag {
  transition: all 0.3s ease;
}

.keyword-tag:hover {
  transform: scale(1.05);
}

.frequency-table {
  width: 100%;
}

.word-cell {
  font-weight: 500;
  cursor: pointer;
  transition: color 0.3s ease;
}

.word-cell:hover {
  color: #409eff;
}

/* 相关性分析样式 */
.correlation-header {
  margin-bottom: 16px;
  font-size: 0.95em;
  color: #606266;
}

.source-word {
  color: #409eff;
  font-weight: 600;
}

.correlation-table {
  width: 100%;
}

.correlation-word {
  font-weight: 500;
}

.similarity-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.similarity-text {
  font-size: 0.85em;
  color: #909399;
  min-width: 40px;
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-col {
    width: 100%;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .secondary-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .topic-action {
    justify-content: space-between;
    width: 100%;
  }
}

/* 动画效果 */
.el-card {
  transition: all 0.3s ease;
}

.el-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.el-tag {
  transition: all 0.3s ease;
}

.el-button {
  transition: all 0.3s ease;
}

.el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
