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
        <el-button
          type="primary"
          :icon="ShoppingCart"
          :disabled="selectedItems.length === 0"
          @click="showAddToListDialog = true"
        >
          加入购物清单 ({{ selectedItems.length }})
        </el-button>
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
        <div class="section-header">
          <span class="section-title">
            <el-icon style="color: var(--color-danger);"><CircleClose /></el-icon>
            已过期物品
          </span>
          <el-checkbox
            :model-value="isAllExpiredSelected"
            :indeterminate="isExpiredIndeterminate"
            @change="toggleAllExpired"
          >
            全选
          </el-checkbox>
        </div>
      </template>
      <el-table :data="expiredItems" stripe @selection-change="handleExpiredSelection">
        <el-table-column type="selection" width="55" />
        <el-table-column label="图片" width="70" align="center">
          <template #default="{ row }">
            <div class="item-thumb">
              <img v-if="row.image" :src="row.image" :alt="row.name" />
              <el-icon v-else class="default-icon"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="addSingleItem(row)">
              加入购物清单
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card>
      <template #header>
        <div class="section-header">
          <span class="section-title">
            <el-icon style="color: var(--color-warning);"><WarningFilled /></el-icon>
            即将过期物品
          </span>
          <el-checkbox
            :model-value="isAllExpiringSelected"
            :indeterminate="isExpiringIndeterminate"
            @change="toggleAllExpiring"
          >
            全选
          </el-checkbox>
        </div>
      </template>

      <el-table :data="expiringItems" v-loading="loading" stripe @selection-change="handleExpiringSelection">
        <el-table-column type="selection" width="55" />
        <el-table-column label="图片" width="70" align="center">
          <template #default="{ row }">
            <div class="item-thumb">
              <img v-if="row.image" :src="row.image" :alt="row.name" />
              <el-icon v-else class="default-icon"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="addSingleItem(row)">
              加入购物清单
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && expiringItems.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <p>太棒了！没有即将过期的物品</p>
      </div>
    </el-card>

    <el-dialog
      v-model="showAddToListDialog"
      title="加入购物清单"
      width="450px"
      @close="resetAddForm"
    >
      <el-form label-width="100px">
        <el-form-item label="选择清单">
          <el-select
            v-model="addToListForm.list_id"
            placeholder="选择购物清单"
            style="width: 100%"
            @change="onListChange"
          >
            <el-option
              v-for="list in shoppingLists"
              :key="list.id"
              :label="list.name"
              :value="list.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!addToListForm.list_id" label="或新建清单">
          <el-input
            v-model="addToListForm.new_list_name"
            placeholder="输入新清单名称"
          />
        </el-form-item>
        <el-form-item label="物品数量">
          <el-input-number v-model="addToListForm.quantity" :min="1" />
          <span style="margin-left: 8px">倍（基于当前数量）</span>
        </el-form-item>
        <el-form-item label="添加数量">
          <span style="color: var(--color-text-light);">
            共 {{ selectedItems.length }} 个物品将被添加
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddToListDialog = false">取消</el-button>
        <el-button type="primary" :loading="addLoading" @click="confirmAddToList">
          确定添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Warning, WarningFilled, CircleClose, Location, ShoppingCart, Picture
} from '@element-plus/icons-vue'
import { getExpiringItems } from '@/api/items'
import { getShoppingLists, addFromExpiring, createShoppingList, addShoppingItem } from '@/api/shopping'

const loading = ref(false)
const items = ref([])
const daysFilter = ref(30)

const selectedExpiredItems = ref([])
const selectedExpiringItems = ref([])

const shoppingLists = ref([])
const showAddToListDialog = ref(false)
const addLoading = ref(false)
const addToListForm = ref({
  list_id: null,
  new_list_name: '',
  quantity: 1
})
let singleAddItem = null

const expiringItems = computed(() => {
  return items.value.filter(item => item.days_left >= 0)
})

const expiredItems = computed(() => {
  return items.value.filter(item => item.days_left < 0)
})

const expiringCount = computed(() => expiringItems.value.length)
const expiredCount = computed(() => expiredItems.value.length)

const selectedItems = computed(() => {
  return [...selectedExpiredItems.value, ...selectedExpiringItems.value]
})

const isAllExpiredSelected = computed(() => {
  return expiredItems.value.length > 0 && selectedExpiredItems.value.length === expiredItems.value.length
})

const isExpiredIndeterminate = computed(() => {
  return selectedExpiredItems.value.length > 0 && selectedExpiredItems.value.length < expiredItems.value.length
})

const isAllExpiringSelected = computed(() => {
  return expiringItems.value.length > 0 && selectedExpiringItems.value.length === expiringItems.value.length
})

const isExpiringIndeterminate = computed(() => {
  return selectedExpiringItems.value.length > 0 && selectedExpiringItems.value.length < expiringItems.value.length
})

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

async function loadShoppingLists() {
  try {
    const res = await getShoppingLists()
    shoppingLists.value = res.list
    if (res.list.length > 0) {
      addToListForm.value.list_id = res.list[0].id
    }
  } catch (error) {
    console.error(error)
  }
}

function handleExpiredSelection(selection) {
  selectedExpiredItems.value = selection
}

function handleExpiringSelection(selection) {
  selectedExpiringItems.value = selection
}

function toggleAllExpired(val) {
  if (val) {
    selectedExpiredItems.value = [...expiredItems.value]
  } else {
    selectedExpiredItems.value = []
  }
}

function toggleAllExpiring(val) {
  if (val) {
    selectedExpiringItems.value = [...expiringItems.value]
  } else {
    selectedExpiringItems.value = []
  }
}

function addSingleItem(item) {
  singleAddItem = item
  addToListForm.value = {
    list_id: shoppingLists.value.length > 0 ? shoppingLists.value[0].id : null,
    new_list_name: '',
    quantity: 1
  }
  showAddToListDialog.value = true
}

function resetAddForm() {
  singleAddItem = null
  addToListForm.value = {
    list_id: shoppingLists.value.length > 0 ? shoppingLists.value[0].id : null,
    new_list_name: '',
    quantity: 1
  }
}

function onListChange() {
  if (addToListForm.value.list_id) {
    addToListForm.value.new_list_name = ''
  }
}

async function confirmAddToList() {
  const itemsToAdd = singleAddItem ? [singleAddItem] : selectedItems.value
  
  if (itemsToAdd.length === 0) {
    ElMessage.warning('请选择要添加的物品')
    return
  }

  let listId = addToListForm.value.list_id
  
  try {
    addLoading.value = true

    if (!listId) {
      if (!addToListForm.value.new_list_name) {
        ElMessage.warning('请选择或创建购物清单')
        return
      }
      const res = await createShoppingList({ name: addToListForm.value.new_list_name })
      listId = res.list.id
    }

    const itemIds = itemsToAdd.map(item => item.id)
    await addFromExpiring({ list_id: listId, item_ids: itemIds })
    
    ElMessage.success(`成功添加 ${itemsToAdd.length} 个物品到购物清单`)
    showAddToListDialog.value = false
    selectedExpiredItems.value = []
    selectedExpiringItems.value = []
  } catch (error) {
    console.error(error)
  } finally {
    addLoading.value = false
  }
}

onMounted(() => {
  loadList()
  loadShoppingLists()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-gray);
  margin: 0 auto;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumb .default-icon {
  font-size: 20px;
  color: var(--color-text-light);
}
</style>
