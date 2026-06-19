<template>
  <div class="page-container">
    <el-tabs v-model="activeTab" class="main-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="首页概览" name="overview">
        <div class="page-header">
          <h2 class="page-title">
            <el-icon><HomeFilled /></el-icon>
            首页概览
          </h2>
          <div class="header-actions">
            <el-button type="primary" :icon="DataLine" @click="goToDataDashboard">
              <el-icon><FullScreen /></el-icon>
              数据大屏
            </el-button>
          </div>
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

        <el-row :gutter="20" class="stat-cards" style="margin-top: 0;">
          <el-col :span="6">
            <div class="stat-card danger clickable" @click="goToItems('need_restock')">
              <div class="stat-icon">🔔</div>
              <div class="stat-value">{{ stats.low_stock_count || 0 }}</div>
              <div class="stat-label">待补货物品</div>
              <div class="stat-hint">点击查看 →</div>
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
      </el-tab-pane>

      <el-tab-pane label="智能分析" name="analysis">
        <div class="page-header">
          <h2 class="page-title">
            <el-icon><DataAnalysis /></el-icon>
            智能分析与收纳建议
          </h2>
        </div>

        <el-card v-loading="analysisLoading" class="suggestions-card">
          <template #header>
            <div class="card-header-with-action">
              <span class="card-title">💡 智能收纳建议</span>
              <el-tag type="info" size="small">基于近30天数据分析</el-tag>
            </div>
          </template>
          <div v-if="suggestions.length === 0" class="empty-state">
            <el-empty description="暂无建议，继续使用系统积累数据" />
          </div>
          <div v-else class="suggestions-list">
            <div
              v-for="(suggestion, idx) in suggestions"
              :key="idx"
              class="suggestion-item"
              :class="`priority-${suggestion.priority}`"
            >
              <div class="suggestion-header">
                <span class="suggestion-icon">{{ suggestion.icon }}</span>
                <span class="suggestion-title">{{ suggestion.title }}</span>
                <el-tag v-if="suggestion.priority === 'high'" type="danger" size="small">高优先级</el-tag>
                <el-tag v-else-if="suggestion.priority === 'medium'" type="warning" size="small">中优先级</el-tag>
                <el-tag v-else type="info" size="small">低优先级</el-tag>
              </div>
              <div class="suggestion-message">{{ suggestion.message }}</div>
              
              <div v-if="suggestion.type === 'easy_access'" class="suggestion-content">
                <div class="item-chips">
                  <el-tag v-for="item in suggestion.items" :key="item.id" size="large" effect="light" class="item-chip">
                    ⭐ {{ item.name }} ({{ item.borrow_count }}次)
                  </el-tag>
                </div>
              </div>

              <div v-if="suggestion.type === 'declutter'" class="suggestion-content">
                <el-table :data="suggestion.items.slice(0, 5)" size="small">
                  <el-table-column prop="name" label="物品名称" />
                  <el-table-column prop="category" label="分类" width="120">
                    <template #default="{ row }">
                      <el-tag v-if="row.category" size="small" type="info">{{ row.category }}</el-tag>
                      <span v-else class="text-light">-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="取用次数" width="100" align="center">
                    <template #default>
                      <el-tag type="info" size="small">0次</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <div v-if="suggestion.type === 'space_optimize'" class="suggestion-content">
                <el-collapse>
                  <el-collapse-item
                    v-for="(box, bIdx) in suggestion.boxes"
                    :key="bIdx"
                    :name="bIdx"
                  >
                    <template #title>
                      <span class="box-collapse-title">
                        <span style="font-weight: 500;">{{ box.box_name }}</span>
                        <el-tag type="success" size="small" style="margin-left: 8px;">
                          剩余 {{ box.free_volume }}cm³ ({{ box.free_percent }}%)
                        </el-tag>
                      </span>
                    </template>
                    <div class="suggested-items-label">推荐放入物品：</div>
                    <div class="item-chips">
                      <el-tag
                        v-for="item in box.suggested_items"
                        :key="item.id"
                        size="large"
                        type="success"
                        effect="light"
                        class="item-chip"
                      >
                        {{ item.name }} (约{{ item.estimated_size * item.quantity }}cm³)
                      </el-tag>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>

              <div v-if="suggestion.type === 'overfull'" class="suggestion-content">
                <el-table :data="suggestion.boxes" size="small">
                  <el-table-column prop="name" label="收纳盒名称" />
                  <el-table-column label="占用率" width="150">
                    <template #default="{ row }">
                      <el-progress
                        :percentage="row.used_percent"
                        :color="row.used_percent >= 95 ? '#f56c6c' : '#e6a23c'"
                        :stroke-width="8"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="已用/总容积" width="180">
                    <template #default="{ row }">
                      {{ Math.round(row.used_volume) }} / {{ Math.round(row.box_volume) }} cm³
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <div v-if="suggestion.type === 'seasonal'" class="suggestion-content">
                <el-table :data="suggestion.items" size="small">
                  <el-table-column prop="name" label="物品名称" />
                  <el-table-column prop="category" label="分类" width="120">
                    <template #default="{ row }">
                      <el-tag v-if="row.category" size="small" type="info">{{ row.category }}</el-tag>
                      <span v-else class="text-light">-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="非当季使用占比" width="150" align="center">
                    <template #default="{ row }">
                      <el-tag type="warning" size="small">{{ row.off_season_ratio }}%</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-card>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header-with-action">
                  <span class="card-title">🔥 取用频次 Top 10</span>
                  <el-tag type="danger" size="small">近30天</el-tag>
                </div>
              </template>
              <div ref="topFreqChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header-with-action">
                  <span class="card-title">📦 取用频次 Bottom 10</span>
                  <el-tag type="info" size="small">可考虑清理</el-tag>
                </div>
              </template>
              <div ref="bottomFreqChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header-with-action">
                  <span class="card-title">📊 收纳盒空间利用率</span>
                  <el-tag size="small">物品体积 / 盒子容积</el-tag>
                </div>
              </template>
              <div ref="spaceChartRef" class="chart-container"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header-with-action">
                  <span class="card-title">🗓️ 季节相关性物品</span>
                  <el-tag type="warning" size="small">换季收纳参考</el-tag>
                </div>
              </template>
              <div class="seasonal-container">
                <el-table v-if="seasonalItems.length > 0" :data="seasonalItems.slice(0, 8)" size="small">
                  <el-table-column prop="name" label="物品名称" min-width="120" />
                  <el-table-column label="主用季节" width="100" align="center">
                    <template #default="{ row }">
                      <el-tag :type="getSeasonTagType(row.dominant_season)" size="small">
                        {{ row.dominant_season_name }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="集中度" width="100">
                    <template #default="{ row }">
                      <el-progress :percentage="row.dominance_ratio" :stroke-width="6" />
                    </template>
                  </el-table-column>
                  <el-table-column label="统计" width="100" align="center">
                    <template #default="{ row }">
                      {{ row.total_borrows }}次
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty v-else description="暂无明显季节性物品数据" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header-with-action">
                  <span class="card-title">📈 一周 7×24 小时取用热力图</span>
                  <el-tag type="success" size="small" v-if="heatmapInfo">
                    高峰: 周{{ ['日','一','二','三','四','五','六'][heatmapInfo.peak_day] }} {{ heatmapInfo.peak_hour }}:00
                  </el-tag>
                </div>
              </template>
              <div ref="heatmapChartRef" class="heatmap-container"></div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getOverview,
  getByCategory,
  getByBox,
  getRecordTrend,
  getUsageFrequency,
  getSpaceUtilization,
  getHeatmapData,
  getSeasonalAnalysis,
  getSmartSuggestions
} from '@/api/stats'
import { getRecordStats } from '@/api/records'
import * as echarts from 'echarts'
import { DataLine, FullScreen } from '@element-plus/icons-vue'

const router = useRouter()

function goToDataDashboard() {
  router.push('/data-dashboard')
}
const activeTab = ref('overview')

const stats = ref({})
const categoryChartRef = ref(null)
const boxChartRef = ref(null)
const trendChartRef = ref(null)
const recentRecords = ref([])

const analysisLoading = ref(false)
const suggestions = ref([])
const seasonalItems = ref([])
const heatmapInfo = ref(null)

const topFreqChartRef = ref(null)
const bottomFreqChartRef = ref(null)
const spaceChartRef = ref(null)
const heatmapChartRef = ref(null)

let categoryChart = null
let boxChart = null
let trendChart = null
let topFreqChart = null
let bottomFreqChart = null
let spaceChart = null
let heatmapChart = null

function formatTime(time) {
  const date = new Date(time)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
}

function goToItems(filterType) {
  const query = {}
  if (filterType === 'need_restock') {
    query.need_restock = 'true'
  }
  router.push({ name: 'Items', query })
}

function goToItemsByCategory(categoryName) {
  router.push({ name: 'Items', query: { category: categoryName } })
}

function getSeasonTagType(season) {
  const map = {
    spring: '',
    summer: 'danger',
    autumn: 'warning',
    winter: 'info'
  }
  return map[season] || ''
}

function handleTabChange(tab) {
  if (tab === 'analysis') {
    nextTick(() => {
      loadAnalysisData()
    })
  }
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
    categoryChart.on('click', (params) => {
      if (params.name && params.name !== '未分类') {
        goToItemsByCategory(params.name)
      }
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

async function loadAnalysisData() {
  analysisLoading.value = true
  try {
    const [freqRes, spaceRes, heatmapRes, seasonalRes, suggestionsRes] = await Promise.all([
      getUsageFrequency(30),
      getSpaceUtilization(),
      getHeatmapData(4),
      getSeasonalAnalysis(),
      getSmartSuggestions(30)
    ])

    seasonalItems.value = seasonalRes.seasonal_items || []
    suggestions.value = suggestionsRes.suggestions || []
    heatmapInfo.value = {
      peak_hour: heatmapRes.peak_hour,
      peak_day: heatmapRes.peak_day
    }

    await nextTick()
    initAnalysisCharts(freqRes, spaceRes, heatmapRes)
  } finally {
    analysisLoading.value = false
  }
}

function initAnalysisCharts(freqData, spaceData, heatmapData) {
  if (topFreqChartRef.value) {
    topFreqChart = echarts.init(topFreqChartRef.value)
    const topItems = freqData.top_10 || []
    topFreqChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: topItems.map(i => i.name),
        axisLabel: { rotate: 30, fontSize: 11 },
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'value',
        name: '取用次数',
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      series: [{
        type: 'bar',
        data: topItems.map((item, idx) => ({
          value: item.borrow_count,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: ['#E74C3C', '#E67E22', '#F39C12', '#F1C40F', '#2ECC71'][idx % 5] },
              { offset: 1, color: ['#C0392B', '#D35400', '#D68910', '#D4AC0D', '#27AE60'][idx % 5] }
            ]),
            borderRadius: [6, 6, 0, 0]
          }
        })),
        barWidth: '60%',
        label: {
          show: true,
          position: 'top',
          color: '#5D4E37',
          fontWeight: 'bold'
        }
      }]
    })
  }

  if (bottomFreqChartRef.value) {
    bottomFreqChart = echarts.init(bottomFreqChartRef.value)
    const bottomItems = freqData.bottom_10 || []
    bottomFreqChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: bottomItems.map(i => i.name),
        axisLabel: { rotate: 30, fontSize: 11 },
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'value',
        name: '取用次数',
        max: Math.max(5, ...bottomItems.map(i => i.borrow_count)),
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      series: [{
        type: 'bar',
        data: bottomItems.map(item => ({
          value: item.borrow_count,
          itemStyle: {
            color: item.borrow_count === 0 ? '#95A5A6' : '#BDC3C7',
            borderRadius: [6, 6, 0, 0]
          }
        })),
        barWidth: '60%',
        label: {
          show: true,
          position: 'top',
          color: '#5D4E37',
          fontWeight: 'bold',
          formatter: (p) => p.value === 0 ? '闲置' : p.value
        }
      }]
    })
  }

  if (spaceChartRef.value) {
    spaceChart = echarts.init(spaceChartRef.value)
    const boxes = spaceData.boxes || []
    spaceChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const box = boxes[params[0].dataIndex]
          let statusText = '正常'
          if (box.status === 'overfull') statusText = '⚠️ 过满'
          else if (box.status === 'underutilized') statusText = '💡 空间充足'
          else if (box.status === 'empty') statusText = '空盒子'
          return `
            <b>${box.name}</b><br/>
            利用率: ${box.utilization_rate}%<br/>
            状态: ${statusText}<br/>
            已用: ${Math.round(box.used_volume)} / ${Math.round(box.box_volume)} cm³<br/>
            剩余: ${Math.round(box.free_volume)} cm³<br/>
            物品数: ${box.item_count}
          `
        }
      },
      grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' },
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'category',
        data: boxes.map(b => b.name),
        inverse: true,
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      series: [{
        type: 'bar',
        data: boxes.map(box => {
          let color = '#81B29A'
          if (box.status === 'overfull') color = '#E07A5F'
          else if (box.status === 'underutilized') color = '#8FC493'
          else if (box.status === 'empty') color = '#BDC3C7'
          return {
            value: box.utilization_rate,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: color },
                { offset: 1, color: color + '99' }
              ]),
              borderRadius: [0, 4, 4, 0]
            }
          }
        }),
        barWidth: '50%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#5D4E37',
          fontWeight: '500'
        }
      },
      {
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [3, 25],
        data: boxes.map(() => 90),
        itemStyle: { color: '#E07A5F', opacity: 0.5 },
        tooltip: { show: false }
      }]
    })
  }

  if (heatmapChartRef.value) {
    heatmapChart = echarts.init(heatmapChartRef.value)
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const hours = []
    for (let i = 0; i < 24; i++) {
      hours.push(i + ':00')
    }

    const maxVal = Math.max(1, ...heatmapData.heatmap.map(h => h[2]))

    heatmapChart.setOption({
      tooltip: {
        position: 'top',
        formatter: (p) => {
          return `${days[p.data[1]]} ${p.data[0]}:00<br/>取用: ${p.data[2]} 次`
        }
      },
      grid: { top: '5%', left: '8%', right: '5%', bottom: '12%' },
      xAxis: {
        type: 'category',
        data: hours,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      yAxis: {
        type: 'category',
        data: days,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: '#8B7355' } }
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#F5F1E8', '#F5E6C8', '#D4B896', '#E07A5F', '#C0392B']
        }
      },
      series: [{
        name: '取用活跃度',
        type: 'heatmap',
        data: heatmapData.heatmap,
        label: {
          show: maxVal <= 5,
          color: '#5D4E37',
          fontSize: 10
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    })
  }
}

onMounted(() => {
  loadStats()
  
  window.addEventListener('resize', () => {
    categoryChart?.resize()
    boxChart?.resize()
    trendChart?.resize()
    topFreqChart?.resize()
    bottomFreqChart?.resize()
    spaceChart?.resize()
    heatmapChart?.resize()
  })
})
</script>

<style scoped>
.main-tabs {
  margin-bottom: -16px;
}

.main-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
  padding: 0 24px;
  height: 48px;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card.green {
  background: linear-gradient(135deg, #B8D8BA 0%, #8FC493 100%);
}

.stat-card.brown {
  background: linear-gradient(135deg, #D4B896 0%, #B8956E 100%);
}

.stat-card.cream {
  background: linear-gradient(135deg, #F5E6C8 0%, #E8D4A8 100%);
}

.stat-card.warning {
  background: linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%);
}

.stat-card.danger {
  background: linear-gradient(135deg, #FFCDD2 0%, #EF9A9A 100%);
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #5D4E37;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #5D4E37;
  opacity: 0.85;
}

.stat-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #5D4E37;
  opacity: 0.7;
  font-weight: 500;
}

.chart-card {
  min-height: 350px;
}

.card-header-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.heatmap-container {
  width: 100%;
  height: 320px;
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

.suggestions-card {
  background: linear-gradient(135deg, #FDF8F0 0%, #F5F1E8 100%);
  border: 1px solid #E8DCC8;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid #ccc;
  transition: all 0.3s ease;
}

.suggestion-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.suggestion-item.priority-high {
  border-left-color: #f56c6c;
  background: linear-gradient(90deg, #FEF2F2 0%, white 30%);
}

.suggestion-item.priority-medium {
  border-left-color: #e6a23c;
  background: linear-gradient(90deg, #FDF6EC 0%, white 30%);
}

.suggestion-item.priority-low {
  border-left-color: #909399;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.suggestion-icon {
  font-size: 20px;
}

.suggestion-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--color-brown-dark);
  flex: 1;
}

.suggestion-message {
  color: var(--color-text-light);
  margin-bottom: 12px;
  padding-left: 30px;
}

.suggestion-content {
  padding-left: 30px;
}

.item-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.item-chip {
  margin: 0 !important;
}

.box-collapse-title {
  display: flex;
  align-items: center;
}

.suggested-items-label {
  font-size: 13px;
  color: var(--color-text-light);
  margin-bottom: 4px;
}

.seasonal-container {
  height: 280px;
  overflow-y: auto;
}

.empty-state {
  padding: 20px 0;
}

.text-light {
  color: var(--color-text-light);
}

.page-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-brown-dark);
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
