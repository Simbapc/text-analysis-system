<template>
    <div v-if="history.length > 0">
        <el-card>
            <template #header>
                历史分析记录
            </template>
            <el-table :data="history" style="width: 100%" height="600">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="original_text" label="原文" />
                <el-table-column prop="sentiment_score" label="情感得分" width="120">
                    <template #default="scope">
                        {{ (scope.row.sentiment_score * 100).toFixed(2) }}%
                    </template>
                </el-table-column>
                <el-table-column prop="keywords" label="关键词" />
                <el-table-column prop="frequency_data" label="词频数据" />
                <el-table-column prop="created_at" label="创建时间" width="180" />
            </el-table>
        </el-card>
    </div>

</template>

<script setup>
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { ref, onMounted } from 'vue';

const history = ref([]);

const fetchHistory = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/history');
        history.value = response.data;
    } catch (error) {
        ElMessage.error('获取历史分析记录失败，请检查后端服务是否正常。');
        console.error('获取历史分析记录失败:',error);
    }
};

onMounted(() => {
    fetchHistory();
});
</script>

export default {
name: 'HistoryComponent'
}
