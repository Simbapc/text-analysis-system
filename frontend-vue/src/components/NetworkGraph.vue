<template>
    <div ref="chartDom" style="width: 100%; height: 500px;"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
// 完整引入 ECharts
import * as echarts from 'echarts';

// 1. 定义 props
//    这个组件通过 'graphData' 属性接收来自父组件的网络数据
const props = defineProps({
    graphData: {
        type: Object,
        required: true,
        // 默认值设为空对象，防止初始时报错
        default: () => ({ nodes: [], links: [] })
    }
});

// 2. 创建一个模板引用，用于获取 DOM 元素
const chartDom = ref(null);
// 保存 ECharts 实例
let myChart = null;

// 3. 定义 ECharts 的配置项和渲染函数
const renderChart = (data) => {
    if (!myChart || data.nodes.length === 0) return;

    const option = {
        title: {
            text: '核心词共现网络',
            subtext: '展示词语之间的关联强度',
            left: 'center'
        },
        tooltip: {
            formatter: (params) => {
                if (params.dataType === 'edge') {
                    return `关系: ${params.data.source} - ${params.data.target}<br/>共现次数: ${params.data.value}`;
                }
                return `核心词: ${params.name}`;
            }
        },
        series: [
            {
                type: 'graph',
                layout: 'force', // 使用力引导布局
                data: data.nodes,
                links: data.links,
                roam: true, // 开启鼠标缩放和平移漫游
                label: {
                    show: true, // 显示节点标签
                    position: 'right'
                },
                force: {
                    repulsion: 150, // 节点之间的斥力因子
                    edgeLength: 50, // 边的两个节点之间的距离
                    gravity: 0.1   // 节点受到的向中心的引力
                },
                // 边的样式
                edgeSymbol: ['none', 'arrow'],
                edgeSymbolSize: [4, 8],
                edgeLabel: {
                    show: true,
                    formatter: (params) => params.data.value, // 在边上显示权重
                    color: '#555'
                },
                lineStyle: {
                    opacity: 0.9,
                    width: 2,
                    curveness: 0.1
                }
            }
        ]
    };

    // 应用配置项
    myChart.setOption(option);
};

// 4. 在组件挂载到 DOM 后初始化 ECharts
onMounted(() => {
    // nextTick 确保 DOM 元素已经准备好
    nextTick(() => {
        myChart = echarts.init(chartDom.value);
        // 初始渲染一次
        renderChart(props.graphData);
    });
});

// 5. 使用 watch 监听 props.graphData 的变化
//    当父组件传来新的数据时，自动更新图表
watch(() => props.graphData, (newData) => {
    renderChart(newData);
}, {
    deep: true // 深度监听，因为 graphData 是一个对象
});
</script>