<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Warning /></el-icon>
        过期提醒
      </h2>
      <div class="header-actions">
        <el-select v-model="daysFilter" style="width: 150px" @change="loadList">
          <el-option :value="7" label="7天内过期" />
          <el-option :value="15" label="15天内过期" />
          <el-option :value="30" label="30天内过期" />
          <el-option :value="90" label="90天内过期" />
        </el-select>
      </div>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="12">
        <div class="stat-card warning">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">{{ expiringCount }}</div>
          <div class="stat-label">即将过期物品</div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="stat-card" style="background: #ffecec;">
          <div class="stat-icon" style="background-color: #ffb3b3; color: #c0392b;">
            ❌
          </div>
          <div class="stat-value" style="color: #c0392b;">{{ expiredCount }}</div>
          <div class="stat-label">已过期物品</div>
        </div>
      </el-col>
    </el-row>

    <el-card v-if="expiredItems.length > 0" style="margin-bottom: 20px;">
      <template #header>
        <span class="section-title">
          <el-icon style="color: var(--color-danger);"><CircleClose /></el-icon>
          已过期物品
        </span>
      </template>
      <el-table :data="expiredItems" stripe>
        <el-table-column prop="name" label="物品名称" min-width="150" />
        <el-table-column prop="box_name" label="所在收纳盒" min-width="150">
          <template #default="{ row }">
            <span v-if="row.box_name">{{ row.box_name }}</span>
            <span v-else class="text-light">-</span>
          </template>
        </el-table-column>
        <el-table-column label="过期天数" width="120">
          <template #default="{ row }">
            <el-tag type="danger" size="small">
              已过期 {{ Math.abs(row.days_left) }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expire_date" label="过期日期" width="120" />
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <span class="section-title">
          <el-icon style="color: var(--color-warning);"><WarningFilled /></el-icon>
          即将过期物品
        </span>
      </template>

      <el-table :data="expiringItems" v-loading="loading" stripe>
        <el-table-column prop="name" label="物品名称" min-width="150">
          <template #default="{ row }">
            <span class="item-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="box_name" label="所在收纳盒" min-width="150">
          <template #default="{ row }">
            <span v-if="row.box_name">{{ row.box_name }}</span>
            <span v-else class="text-light">-</span>
            <div v-if="row.box_location" class="sub-text">
              <el-icon><Location /></el-icon>
              {{ row.box_location }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.days_left <= 7 ? 'danger' : row.days_left <= 15 ? 'warning' : 'info'"
              size="small"
            >
              还剩 {{ row.days_left }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expire_date" label="过期日期" width="120" />
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small" type="info">{{ row.category }}</el-tag>
            <span v-else class="text-light">-</span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && expiringItems.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <p>太棒了！没有即将过期的物品</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Warning, WarningFilled, CircleClose, Location
} from '@element-plus/icons-vue'
import { getExpiringItems } from '@/api/items'

const loading = ref(false)
const items = ref([])
const daysFilter = ref(30)

const expiringItems = computed(() => {
  return items.value.filter(item => item.days_left >= 0)
})

const expiredItems = computed(() => {
  return items.value.filter(item => item.days_left < 0)
})

const expiringCount = computed(() => expiringItems.value.length)
const expiredCount = computed(() => expiredItems.value.length)

async function loadList() {
  loading.value = true
  try {
    const res = await getExpiringItems(daysFilter.value)
    items.value = res.list
  } catch (error) {
    console.error(error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.item-name {
  font-weight: 500;
}

.sub-text {
  font-size: 12px;
  color: var(--color-text-light);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.text-light {
  color: var(--color-text-light);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-light);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
</style>
