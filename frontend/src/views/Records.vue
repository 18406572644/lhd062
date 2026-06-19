<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Document /></el-icon>
        存取记录
      </h2>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="类型">
          <el-select
            v-model="filters.type"
            placeholder="全部类型"
            clearable
            style="width: 120px"
            @change="loadList"
          >
            <el-option label="取用" value="borrow" />
            <el-option label="归还" value="return" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="8">
        <div class="stat-card green">
          <div class="stat-icon">📤</div>
          <div class="stat-value">{{ todayStats.today_borrow || 0 }}</div>
          <div class="stat-label">今日取用</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card brown">
          <div class="stat-icon">📥</div>
          <div class="stat-value">{{ todayStats.today_return || 0 }}</div>
          <div class="stat-label">今日归还</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card cream">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ pagination.total }}</div>
          <div class="stat-label">总记录数</div>
        </div>
      </el-col>
    </el-row>

    <el-card>
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'borrow' ? 'warning' : 'success'" size="small">
              {{ row.type === 'borrow' ? '取用' : '归还' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="item_name" label="物品名称" min-width="150" />
        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.item_unit || '' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150">
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-light">-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getRecordList, getRecordStats } from '@/api/records'
import { Document } from '@element-plus/icons-vue'

const loading = ref(false)
const records = ref([])
const dateRange = ref([])
const todayStats = ref({})

const filters = reactive({
  type: '',
  start_date: '',
  end_date: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

function formatTime(time) {
  const date = new Date(time)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function handleDateChange(val) {
  if (val && val.length === 2) {
    filters.start_date = val[0]
    filters.end_date = val[1]
  } else {
    filters.start_date = ''
    filters.end_date = ''
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await getRecordList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined
    })
    records.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

async function loadTodayStats() {
  try {
    const res = await getRecordStats()
    todayStats.value = res
  } catch (error) {
    console.error(error)
  }
}

function resetFilters() {
  filters.type = ''
  filters.start_date = ''
  filters.end_date = ''
  dateRange.value = []
  pagination.page = 1
  loadList()
}

onMounted(() => {
  loadList()
  loadTodayStats()
})
</script>

<style scoped>
.text-light {
  color: var(--color-text-light);
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
