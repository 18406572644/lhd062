<template>
  <div class="data-dashboard" ref="dashboardRef">
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="dashboard-title">
          <span class="title-icon">📊</span>
          家庭资产总览
        </h1>
        <div class="refresh-info">
          <span class="refresh-dot" :class="{ active: isRefreshing }"></span>
          <span>上次更新：{{ lastUpdateTime }}</span>
          <span class="refresh-countdown">下次刷新：{{ countdown }}s</span>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Refresh" @click="refreshData" :loading="isRefreshing">
          刷新数据
        </el-button>
        <el-button type="success" :icon="Picture" @click="exportImage" :loading="isExporting">
          导出图片
        </el-button>
        <el-button :icon="Close" @click="goBack">
          退出大屏
        </el-button>
      </div>
    </div>

    <div class="dashboard-metrics">
      <div class="metric-card" v-for="(metric, index) in metrics" :key="metric.key" :style="{ '--card-color': metric.color }">
        <div class="metric-icon">{{ metric.icon }}</div>
        <div class="metric-content">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
        <div class="metric-glow"></div>
      </div>
    </div>

    <div class="dashboard-main">
      <div class="dashboard-column left-column">
        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon">🗺️</span>
            <span class="panel-title">收纳空间分布</span>
          </div>
          <div ref="treemapRef" class="chart-container treemap-chart"></div>
        </div>

        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon">💰</span>
            <span class="panel-title">分类价值占比</span>
          </div>
          <div ref="pieChartRef" class="chart-container pie-chart"></div>
        </div>
      </div>

      <div class="dashboard-column center-column">
        <div class="chart-panel large-panel">
          <div class="panel-header">
            <span class="panel-icon">📦</span>
            <span class="panel-title">3D 收纳盒可视化</span>
            <span class="panel-hint">点击收纳盒查看详情</span>
          </div>
          <div ref="box3dRef" class="chart-container box3d-chart"></div>
        </div>

        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon">📈</span>
            <span class="panel-title">最近 30 天存取趋势</span>
          </div>
          <div ref="trendChartRef" class="chart-container trend-chart"></div>
        </div>
      </div>

      <div class="dashboard-column right-column">
        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon">📝</span>
            <span class="panel-title">实时存取记录</span>
          </div>
          <div class="records-container" ref="recordsContainer">
            <div class="records-scroll" ref="recordsScroll">
              <div
                v-for="record in dashboardData.recent_records"
                :key="record.id"
                class="record-item"
              >
                <div class="record-type" :class="record.type">
                  {{ record.type === 'borrow' ? '取' : '存' }}
                </div>
                <div class="record-info">
                  <div class="record-name">{{ record.item_name }}</div>
                  <div class="record-meta">
                    <span>{{ record.type === 'borrow' ? '取出' : '归还' }} {{ record.quantity }}{{ record.item_unit }}</span>
                    <span>·</span>
                    <span>{{ record.box_name || '未归类' }}</span>
                  </div>
                </div>
                <div class="record-time">{{ formatRecordTime(record.created_at) }}</div>
              </div>
              <div v-if="!dashboardData.recent_records || dashboardData.recent_records.length === 0" class="empty-records">
                暂无存取记录
              </div>
            </div>
          </div>
        </div>

        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon warning-icon">⚠️</span>
            <span class="panel-title">过期预警</span>
            <el-tag size="small" type="danger">{{ dashboardData.expiring_items?.length || 0 }} 项</el-tag>
          </div>
          <div class="warning-list">
            <div
              v-for="item in dashboardData.expiring_items?.slice(0, 5)"
              :key="item.id"
              class="warning-item"
              :class="{ urgent: item.days_left <= 7 }"
            >
              <div class="warning-icon">⏰</div>
              <div class="warning-info">
                <div class="warning-name">{{ item.name }}</div>
                <div class="warning-meta">
                  <span>{{ item.box_name || '未归类' }}</span>
                  <span>·</span>
                  <span>剩余 {{ item.quantity }}{{ item.unit }}</span>
                </div>
              </div>
              <div class="warning-days" :class="{ danger: item.days_left <= 7, warning: item.days_left > 7 && item.days_left <= 15 }">
                {{ item.days_left <= 0 ? '已过期' : item.days_left + '天后' }}
              </div>
            </div>
            <div v-if="!dashboardData.expiring_items || dashboardData.expiring_items.length === 0" class="empty-warning">
              暂无过期预警
            </div>
          </div>
        </div>

        <div class="chart-panel">
          <div class="panel-header">
            <span class="panel-icon lowstock-icon">📉</span>
            <span class="panel-title">低库存预警</span>
            <el-tag size="small" type="warning">{{ dashboardData.low_stock_items?.length || 0 }} 项</el-tag>
          </div>
          <div class="warning-list">
            <div
              v-for="item in dashboardData.low_stock_items?.slice(0, 5)"
              :key="item.id"
              class="warning-item low-stock"
            >
              <div class="warning-icon lowstock">📦</div>
              <div class="warning-info">
                <div class="warning-name">{{ item.name }}</div>
                <div class="warning-meta">
                  <span>{{ item.category || '未分类' }}</span>
                  <span>·</span>
                  <span>{{ item.box_name || '未归类' }}</span>
                </div>
              </div>
              <div class="warning-stock">
                <span class="current">{{ item.quantity }}</span>
                <span class="divider">/</span>
                <span class="min">{{ item.min_stock }}</span>
              </div>
            </div>
            <div v-if="!dashboardData.low_stock_items || dashboardData.low_stock_items.length === 0" class="empty-warning">
              暂无低库存预警
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-footer">
      <div class="decoration-line left"></div>
      <div class="footer-content">
        <span>🏠 家庭收纳管理系统 · 数据可视化大屏</span>
      </div>
      <div class="decoration-line right"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Picture, Close } from '@element-plus/icons-vue'
import { getDashboardData } from '@/api/stats'
import * as echarts from 'echarts'
import 'echarts-gl'
import html2canvas from 'html2canvas'

const router = useRouter()

const dashboardRef = ref(null)
const treemapRef = ref(null)
const pieChartRef = ref(null)
const box3dRef = ref(null)
const trendChartRef = ref(null)
const recordsContainer = ref(null)
const recordsScroll = ref(null)

const isRefreshing = ref(false)
const isExporting = ref(false)
const lastUpdateTime = ref('--:--:--')
const countdown = ref(30)

const dashboardData = reactive({
  overview: {},
  location_stats: [],
  category_value: [],
  boxes_3d: [],
  recent_records: [],
  expiring_items: [],
  low_stock_items: [],
  trend_30: []
})

const metrics = computed(() => [
  {
    key: 'box_count',
    icon: '📦',
    label: '收纳盒总数',
    value: dashboardData.overview.box_count || 0,
    color: '#00d4ff'
  },
  {
    key: 'item_count',
    icon: '📋',
    label: '物品总数',
    value: dashboardData.overview.item_count || 0,
    color: '#7cffb2'
  },
  {
    key: 'total_value',
    icon: '💰',
    label: '物品总估值 (元)',
    value: formatNumber(dashboardData.overview.total_value || 0),
    color: '#ffd700'
  },
  {
    key: 'low_stock_count',
    icon: '🔔',
    label: '待补货数',
    value: dashboardData.overview.low_stock_count || 0,
    color: '#ff7c7c'
  },
  {
    key: 'expire_soon_count',
    icon: '⏰',
    label: '即将过期数',
    value: dashboardData.overview.expire_soon_count || 0,
    color: '#ff9f43'
  }
])

let treemapChart = null
let pieChart = null
let box3dChart = null
let trendChart = null
let refreshTimer = null
let scrollTimer = null

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

function formatRecordTime(time) {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function updateLastUpdateTime() {
  const now = new Date()
  lastUpdateTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

async function refreshData() {
  if (isRefreshing.value) return
  
  isRefreshing.value = true
  countdown.value = 30
  
  try {
    const data = await getDashboardData()
    
    Object.assign(dashboardData, data)
    
    updateLastUpdateTime()
    
    await nextTick()
    initCharts()
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    isRefreshing.value = false
  }
}

function initCharts() {
  initTreemap()
  initPieChart()
  initBox3dChart()
  initTrendChart()
}

function initTreemap() {
  if (!treemapRef.value) return
  
  if (!treemapChart) {
    treemapChart = echarts.init(treemapRef.value, 'dark')
  }
  
  const data = dashboardData.location_stats?.map(item => ({
    name: item.location,
    value: item.box_count,
    item_count: item.item_count,
    total_value: item.total_value
  })) || []
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: '#00d4ff',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const d = params.data
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #00d4ff;">${d.name}</div>
            <div>收纳盒: ${d.value} 个</div>
            <div>物品数: ${d.item_count || 0} 件</div>
            <div>总价值: ¥${(d.total_value || 0).toLocaleString()}</div>
          </div>
        `
      }
    },
    series: [{
      type: 'treemap',
      width: '95%',
      height: '90%',
      top: '5%',
      left: '2.5%',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        formatter: (params) => {
          const name = params.name
          const value = params.value
          if (name.length > 6) {
            return name.slice(0, 6) + '...\n' + value + '个'
          }
          return name + '\n' + value + '个'
        },
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
      },
      itemStyle: {
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 2,
        gapWidth: 2
      },
      levels: [
        {
          itemStyle: {
            borderWidth: 3,
            borderColor: 'rgba(0, 212, 255, 0.5)'
          },
          upperLabel: { show: false }
        },
        {
          colorSaturation: [0.35, 0.6],
          itemStyle: {
            borderWidth: 2,
            gapWidth: 1,
            borderColorSaturation: 0.6
          }
        },
        {
          colorSaturation: [0.35, 0.6],
          itemStyle: {
            borderWidth: 1,
            gapWidth: 1,
            borderColorSaturation: 0.6
          }
        },
        {
          colorSaturation: [0.3, 0.5],
          itemStyle: {
            borderWidth: 1,
            gapWidth: 1,
            borderColorSaturation: 0.6
          }
        }
      ],
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }]
    }]
  }
  
  treemapChart.setOption(option)
}

function initPieChart() {
  if (!pieChartRef.value) return
  
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value, 'dark')
  }
  
  const data = dashboardData.category_value?.map(item => ({
    name: item.category,
    value: item.total_value,
    count: item.count
  })) || []
  
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: '#ffd700',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const percent = totalValue > 0 ? ((params.value / totalValue) * 100).toFixed(1) : 0
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #ffd700;">${params.name}</div>
            <div>价值: ¥${params.value.toLocaleString()}</div>
            <div>占比: ${percent}%</div>
            <div>物品数: ${params.data.count} 件</div>
          </div>
        `
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#8899aa', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      formatter: (name) => {
        const item = data.find(d => d.name === name)
        if (!item) return name
        const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0
        return `${name} ${percent}%`
      }
    },
    color: ['#00d4ff', '#7cffb2', '#ffd700', '#ff7c7c', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9'],
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: 'rgba(0, 20, 40, 0.8)',
        borderWidth: 3
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: '#fff',
          formatter: '{b}\n¥{c}'
        },
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 212, 255, 0.5)'
        }
      },
      labelLine: {
        show: false
      },
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }]
    }]
  }
  
  pieChart.setOption(option)
}

function initBox3dChart() {
  if (!box3dRef.value) return
  
  if (!box3dChart) {
    box3dChart = echarts.init(box3dRef.value, 'dark')
  }
  
  const boxes = dashboardData.boxes_3d || []
  const boxData = []
  
  const gridSize = Math.ceil(Math.sqrt(boxes.length))
  const spacing = 2.5
  
  boxes.forEach((box, index) => {
    const row = Math.floor(index / gridSize)
    const col = index % gridSize
    
    const width = box.width ? Math.max(0.5, box.width / 20) : 1
    const height = box.height ? Math.max(0.5, box.height / 20) : 1
    const depth = box.depth ? Math.max(0.5, box.depth / 20) : 1
    
    const value = Math.max(1, box.total_value || box.item_count)
    
    boxData.push({
      name: box.name,
      value: [
        col * spacing - (gridSize * spacing) / 2,
        height / 2,
        row * spacing - (gridSize * spacing) / 2,
        width,
        height,
        depth,
        value
      ],
      itemStyle: {
        color: box.color || '#00d4ff',
        opacity: 0.8
      },
      boxInfo: box
    })
  })
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: '#00d4ff',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const box = params.data.boxInfo
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #00d4ff;">${box.name}</div>
            <div>位置: ${box.location || '未指定'}</div>
            <div>物品数: ${box.item_count || 0} 件</div>
            <div>总价值: ¥${(box.total_value || 0).toLocaleString()}</div>
            <div style="margin-top: 4px; font-size: 11px; color: #8899aa;">点击查看详情 →</div>
          </div>
        `
      }
    },
    xAxis3D: {
      type: 'value',
      show: false,
      min: -gridSize * spacing / 2 - 2,
      max: gridSize * spacing / 2 + 2
    },
    yAxis3D: {
      type: 'value',
      show: false,
      min: 0,
      max: 5
    },
    zAxis3D: {
      type: 'value',
      show: false,
      min: -gridSize * spacing / 2 - 2,
      max: gridSize * spacing / 2 + 2
    },
    grid3D: {
      show: false,
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 8,
        distance: 25,
        minDistance: 10,
        maxDistance: 50,
        panMouseButton: 'left',
        rotateMouseButton: 'right',
        angle: 25
      },
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high'
        },
        ambient: {
          intensity: 0.4
        },
        ambientCubemap: {
          texture: '',
          diffuseIntensity: 0.5
        }
      },
      postEffect: {
        enable: true,
        SSAO: {
          enable: true,
          radius: 2,
          intensity: 0.6,
          quality: 'high'
        },
        bloom: {
          enable: true,
          bloomIntensity: 0.3
        }
      },
      temporalSuperSampling: {
        enable: true
      }
    },
    series: [{
      type: 'bar3D',
      name: '收纳盒',
      data: boxData.length > 0 ? boxData : [{
        name: '暂无收纳盒',
        value: [0, 0.5, 0, 1, 1, 1, 1],
        itemStyle: { color: '#555', opacity: 0.5 },
        boxInfo: { name: '暂无数据', item_count: 0, total_value: 0 }
      }],
      barSize: [1, 1, 1],
      shading: 'realistic',
      realisticMaterial: {
        roughness: 0.4,
        metalness: 0.3
      },
      itemStyle: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        opacity: 0.9
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
          borderColor: '#fff',
          borderWidth: 2
        }
      }
    }]
  }
  
  box3dChart.setOption(option)
  
  box3dChart.off('click')
  box3dChart.on('click', (params) => {
    if (params.data && params.data.boxInfo && params.data.boxInfo.id) {
      router.push(`/boxes/${params.data.boxInfo.id}`)
    }
  })
}

function initTrendChart() {
  if (!trendChartRef.value) return
  
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value, 'dark')
  }
  
  const data = dashboardData.trend_30 || []
  const dates = data.map(item => item.date.slice(5))
  const borrowData = data.map(item => item.borrow_qty || item.borrow || 0)
  const returnData = data.map(item => item.return_qty || item.return || 0)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: '#00d4ff',
      textStyle: { color: '#fff' },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: '#00d4ff', type: 'dashed' }
      }
    },
    legend: {
      data: ['取出', '存入'],
      textStyle: { color: '#8899aa' },
      top: 5,
      right: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#334455' } },
      axisLabel: { color: '#667788', fontSize: 10 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#334455' } },
      axisLabel: { color: '#667788', fontSize: 10 },
      splitLine: { lineStyle: { color: '#223344', type: 'dashed' } }
    },
    series: [
      {
        name: '取出',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: borrowData,
        lineStyle: {
          color: '#ff7c7c',
          width: 2,
          shadowColor: 'rgba(255, 124, 124, 0.5)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#ff7c7c',
          borderColor: '#fff',
          borderWidth: 1
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 124, 124, 0.4)' },
            { offset: 1, color: 'rgba(255, 124, 124, 0.05)' }
          ])
        }
      },
      {
        name: '存入',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: returnData,
        lineStyle: {
          color: '#7cffb2',
          width: 2,
          shadowColor: 'rgba(124, 255, 178, 0.5)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#7cffb2',
          borderColor: '#fff',
          borderWidth: 1
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(124, 255, 178, 0.4)' },
            { offset: 1, color: 'rgba(124, 255, 178, 0.05)' }
          ])
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

function handleResize() {
  treemapChart?.resize()
  pieChart?.resize()
  box3dChart?.resize()
  trendChart?.resize()
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      refreshData()
    }
  }, 1000)
}

function startScrollAnimation() {
  if (!recordsScroll.value) return
  
  scrollTimer = setInterval(() => {
    if (!recordsContainer.value || !recordsScroll.value) return
    
    const container = recordsContainer.value
    const scroll = recordsScroll.value
    
    if (scroll.scrollHeight <= container.clientHeight) return
    
    if (scroll.scrollTop >= scroll.scrollHeight - container.clientHeight) {
      scroll.scrollTop = 0
    } else {
      scroll.scrollTop += 1
    }
  }, 60)
}

async function exportImage() {
  if (!dashboardRef.value || isExporting.value) return
  
  isExporting.value = true
  
  try {
    const canvas = await html2canvas(dashboardRef.value, {
      backgroundColor: '#0a0e17',
      scale: 2,
      useCORS: true,
      logging: false
    })
    
    const link = document.createElement('a')
    link.download = `家庭资产大屏_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
    ElMessage.success('图片导出成功')
  } catch (error) {
    console.error('导出图片失败:', error)
    ElMessage.error('导出图片失败')
  } finally {
    isExporting.value = false
  }
}

function goBack() {
  router.push('/dashboard')
}

onMounted(async () => {
  await refreshData()
  startAutoRefresh()
  startScrollAnimation()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (scrollTimer) clearInterval(scrollTimer)
  window.removeEventListener('resize', handleResize)
  
  treemapChart?.dispose()
  pieChart?.dispose()
  box3dChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped>
.data-dashboard {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #0a0e17 0%, #0d1321 50%, #0a0e17 100%);
  color: #e0e6ed;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.data-dashboard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(124, 255, 178, 0.04) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, transparent 50%, rgba(255, 215, 0, 0.1) 100%);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.dashboard-header::before,
.dashboard-header::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #00d4ff;
}

.dashboard-header::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
  border-radius: 12px 0 0 0;
}

.dashboard-header::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 12px 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dashboard-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff 0%, #7cffb2 50%, #ffd700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  -webkit-text-fill-color: initial;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.refresh-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #8899aa;
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #556677;
  transition: all 0.3s ease;
}

.refresh-dot.active {
  background: #00d4ff;
  box-shadow: 0 0 10px #00d4ff;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.refresh-countdown {
  color: #ffd700;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 12px;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.metric-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: default;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-color);
  opacity: 0.8;
}

.metric-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, var(--card-color) 0%, transparent 70%);
  opacity: 0.15;
  transform: translate(30%, -30%);
}

.metric-card:hover {
  transform: translateY(-3px);
  border-color: var(--card-color);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 212, 255, 0.1);
}

.metric-icon {
  font-size: 40px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 10px var(--card-color));
  position: relative;
  z-index: 1;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--card-color);
  line-height: 1;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.metric-label {
  font-size: 13px;
  color: #8899aa;
  white-space: nowrap;
}

.metric-glow {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--card-color) 0%, transparent 70%);
  opacity: 0.1;
  pointer-events: none;
}

.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-panel {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.chart-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--card-color, #00d4ff), transparent);
  opacity: 0.5;
}

.large-panel {
  flex: 1.2;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.15);
}

.panel-icon {
  font-size: 18px;
  filter: drop-shadow(0 0 5px currentColor);
}

.warning-icon {
  color: #ff7c7c;
}

.lowstock-icon {
  color: #ffd700;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #e0e6ed;
  flex: 1;
}

.panel-hint {
  font-size: 11px;
  color: #667788;
  font-weight: normal;
}

.chart-container {
  width: 100%;
}

.treemap-chart {
  height: 280px;
}

.pie-chart {
  height: 280px;
}

.box3d-chart {
  height: 380px;
}

.trend-chart {
  height: 220px;
}

.records-container {
  height: 240px;
  overflow: hidden;
  position: relative;
}

.records-container::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(transparent, rgba(15, 23, 42, 0.95));
  pointer-events: none;
  z-index: 2;
}

.records-scroll {
  height: 100%;
  overflow-y: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.record-item:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
}

.record-type {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.record-type.borrow {
  background: rgba(255, 124, 124, 0.2);
  color: #ff7c7c;
  border: 1px solid rgba(255, 124, 124, 0.4);
}

.record-type.return {
  background: rgba(124, 255, 178, 0.2);
  color: #7cffb2;
  border: 1px solid rgba(124, 255, 178, 0.4);
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0e6ed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-meta {
  font-size: 11px;
  color: #667788;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.record-time {
  font-size: 11px;
  color: #8899aa;
  white-space: nowrap;
}

.empty-records,
.empty-warning {
  text-align: center;
  padding: 40px 20px;
  color: #556677;
  font-size: 13px;
}

.warning-list {
  max-height: 220px;
  overflow-y: auto;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: rgba(255, 124, 124, 0.05);
  border: 1px solid rgba(255, 124, 124, 0.15);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.warning-item.low-stock {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.15);
}

.warning-item:hover {
  background: rgba(255, 124, 124, 0.1);
}

.warning-item.low-stock:hover {
  background: rgba(255, 215, 0, 0.1);
}

.warning-item.urgent {
  background: rgba(255, 124, 124, 0.15);
  border-color: rgba(255, 124, 124, 0.4);
  animation: urgentPulse 2s ease-in-out infinite;
}

@keyframes urgentPulse {
  0%, 100% { background: rgba(255, 124, 124, 0.15); }
  50% { background: rgba(255, 124, 124, 0.25); }
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-icon.lowstock {
  color: #ffd700;
}

.warning-info {
  flex: 1;
  min-width: 0;
}

.warning-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0e6ed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.warning-meta {
  font-size: 11px;
  color: #667788;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.warning-days {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 159, 67, 0.2);
  color: #ff9f43;
  white-space: nowrap;
}

.warning-days.warning {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.warning-days.danger {
  background: rgba(255, 124, 124, 0.2);
  color: #ff7c7c;
}

.warning-stock {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-weight: 600;
  font-size: 14px;
}

.warning-stock .current {
  color: #ff7c7c;
}

.warning-stock .divider {
  color: #556677;
  font-size: 12px;
}

.warning-stock .min {
  color: #8899aa;
  font-size: 12px;
}

.dashboard-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
  padding: 12px;
  position: relative;
  z-index: 1;
}

.decoration-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
}

.decoration-line.left {
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3));
}

.decoration-line.right {
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.3), transparent);
}

.footer-content {
  font-size: 12px;
  color: #667788;
  white-space: nowrap;
}

.warning-list::-webkit-scrollbar,
.records-scroll::-webkit-scrollbar {
  width: 4px;
}

.warning-list::-webkit-scrollbar-track,
.records-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.warning-list::-webkit-scrollbar-thumb,
.records-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.3);
  border-radius: 2px;
}

@media (max-width: 1600px) {
  .dashboard-metrics {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .metric-value {
    font-size: 26px;
  }
  
  .metric-icon {
    font-size: 32px;
  }
  
  .dashboard-main {
    grid-template-columns: 1fr 1.2fr 1fr;
  }
  
  .box3d-chart {
    height: 340px;
  }
}
</style>
