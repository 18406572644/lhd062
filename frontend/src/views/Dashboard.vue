<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><HomeFilled /></el-icon>
        首页概览
      </h2>
    </div>

    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card green">
          <div class="stat-icon">📦</div>
          <div class="stat-value">{{ stats.box_count || 0 }}</div>
          <div class="stat-label">收纳盒数量</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card brown">
          <div class="stat-icon">📋</div>
          <div class="stat-value">{{ stats.item_count || 0 }}</div>
          <div class="stat-label">物品总数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card cream">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ stats.stored_count || 0 }}</div>
          <div class="stat-label">在库物品</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card warning">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">{{ stats.expire_soon_count || 0 }}</div>
          <div class="stat-label">即将过期</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">物品分类统计</span>
          </template>
          <div ref="categoryChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">收纳盒物品分布</span>
          </template>
          <div ref="boxChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">近7天存取记录</span>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span class="card-title">近期活动</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="record in recentRecords"
              :key="record.id"
              :timestamp="formatTime(record.created_at)"
              :type="record.type === 'borrow' ? 'warning' : 'success'"
            >
              <span class="record-item">
                <el-tag :type="record.type === 'borrow' ? 'warning' : 'success'" size="small">
                  {{ record.type === 'borrow' ? '取用' : '归还' }}
                </el-tag>
                <span class="record-name">{{ record.item_name }}</span>
                <span class="record-qty">×{{ record.quantity }}{{ record.item_unit }}</span>
              </span>
            </el-timeline-item>
            <el-timeline-item v-if="recentRecords.length === 0">
              暂无记录
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { getOverview, getByCategory, getByBox, getRecordTrend } from '@/api/stats'
import { getRecordStats } from '@/api/records'
import * as echarts from 'echarts'

const stats = ref({})
const categoryChartRef = ref(null)
const boxChartRef = ref(null)
const trendChartRef = ref(null)
const recentRecords = ref([])

let categoryChart = null
let boxChart = null
let trendChart = null

function formatTime(time) {
  const date = new Date(time)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
}

async function loadStats() {
  const [overviewRes, categoryRes, boxRes, trendRes, recordStatsRes] = await Promise.all([
    getOverview(),
    getByCategory(),
    getByBox(),
    getRecordTrend(7),
    getRecordStats()
  ])
  
  stats.value = overviewRes
  recentRecords.value = recordStatsRes.recent || []
  
  await nextTick()
  initCharts(categoryRes.list, boxRes.list, trendRes.list)
}

function initCharts(categoryData, boxData, trendData) {
  if (categoryChartRef.value) {
    categoryChart = echarts.init(categoryChartRef.value)
    categoryChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: '5%', left: 'center' },
      color: ['#B8D8BA', '#D4B896', '#F5E6C8', '#8FC493', '#B8956E', '#90EE90', '#DEB887'],
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: categoryData.map(item => ({
          name: item.category,
          value: item.count
        }))
      }]
    })
  }

  if (boxChartRef.value) {
    boxChart = echarts.init(boxChartRef.value)
    boxChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'category',
        data: boxData.map(item => item.name),
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      series: [{
        type: 'bar',
        data: boxData.map((item, index) => ({
          value: item.item_count,
          itemStyle: {
            color: item.color || ['#B8D8BA', '#D4B896', '#F5E6C8', '#8FC493'][index % 4],
            borderRadius: [0, 6, 6, 0]
          }
        })),
        barWidth: '60%'
      }]
    })
  }

  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['取用', '归还'], bottom: '0%' },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.map(item => item.date.slice(5)),
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      color: ['#E07A5F', '#81B29A'],
      series: [
        {
          name: '取用',
          type: 'line',
          smooth: true,
          data: trendData.map(item => item.borrow),
          areaStyle: { opacity: 0.3 }
        },
        {
          name: '归还',
          type: 'line',
          smooth: true,
          data: trendData.map(item => item.return),
          areaStyle: { opacity: 0.3 }
        }
      ]
    })
  }
}

onMounted(() => {
  loadStats()
  
  window.addEventListener('resize', () => {
    categoryChart?.resize()
    boxChart?.resize()
    trendChart?.resize()
  })
})
</script>

<style scoped>
.stat-cards {
  margin-bottom: 20px;
}

.chart-card {
  height: 350px;
}

.card-title {
  font-weight: 600;
  color: var(--color-brown-dark);
  font-size: 16px;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-name {
  color: var(--color-text);
}

.record-qty {
  color: var(--color-text-light);
  font-size: 12px;
}
</style>
