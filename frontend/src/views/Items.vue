<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Goods /></el-icon>
        物品管理
      </h2>
      <div class="header-actions">
        <el-button
          type="danger"
          :icon="ShoppingCart"
          @click="generateRestockList"
        >
          生成补货清单
        </el-button>
        <el-button
          type="warning"
          :icon="ShoppingCart"
          :disabled="selectedItems.length === 0"
          @click="showAddToListDialog = true"
        >
          加入购物清单 ({{ selectedItems.length }})
        </el-button>
        <el-button type="success" :icon="ArrowDown" @click="showBorrowDialog">
          取用登记
        </el-button>
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加物品
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="filter-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="全部物品" name="all" />
      <el-tab-pane label="在库" name="stored" />
      <el-tab-pane label="已取用" name="borrowed" />
      <el-tab-pane label="即将过期" name="expire_soon" />
      <el-tab-pane :label="restockTabLabel" name="need_restock" />
    </el-tabs>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索物品名称/描述"
            clearable
            @clear="loadList"
            @keyup.enter="loadList"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filters.category"
            placeholder="全部分类"
            clearable
            style="width: 180px"
            @change="loadList"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.name"
            >
              <div class="category-option">
                <span class="category-option-icon">{{ cat.icon || '📦' }}</span>
                <span class="category-option-name">{{ cat.name }}</span>
                <span class="category-option-count">{{ cat.item_count || 0 }}件</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="收纳盒">
          <el-select
            v-model="filters.box_id"
            placeholder="全部收纳盒"
            clearable
            style="width: 180px"
            @change="loadList"
          >
            <el-option
              v-for="box in boxList"
              :key="box.id"
              :label="box.name"
              :value="box.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
            @change="loadList"
          >
            <el-option label="在库" value="stored" />
            <el-option label="已取用" value="borrowed" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存">
          <el-select
            v-model="filters.low_stock"
            placeholder="全部库存"
            clearable
            style="width: 120px"
            @change="loadList"
          >
            <el-option label="库存不足" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="items" v-loading="loading" stripe @selection-change="handleSelectionChange" :row-class-name="getRowClassName">
        <el-table-column type="selection" width="55" />
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <div class="item-thumb" @click="handleViewImage(row)">
              <img v-if="row.image" :src="row.image" :alt="row.name" />
              <el-icon v-else class="default-icon"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="物品名称" min-width="180">
          <template #default="{ row }">
            <div class="item-name-wrapper">
              <span class="item-name">{{ row.name }}</span>
              <el-tag
                v-if="row.need_restock === 1 || row.need_restock === true"
                size="small"
                type="danger"
                effect="dark"
                class="restock-tag"
              >
                <el-icon><Warning /></el-icon>
                待补货
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <div v-if="row.category" class="category-tag-wrapper">
              <span
                class="category-color-dot"
                :style="{ backgroundColor: getCategoryColor(row.category) }"
              ></span>
              <span class="category-tag-text">{{ row.category }}</span>
            </div>
            <span v-else class="text-light">-</span>
          </template>
        </el-table-column>
        <el-table-column label="所在收纳盒" min-width="150">
          <template #default="{ row }">
            <span v-if="row.box_name">{{ row.box_name }}</span>
            <span v-else class="text-light">未归类</span>
            <div v-if="row.box_location" class="sub-text">
              <el-icon><Location /></el-icon>
              {{ row.box_location }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="140">
          <template #default="{ row }">
            <div class="qty-wrapper">
              <span :class="{ 'qty-low': isLowStock(row) }">
                {{ row.quantity }} {{ row.unit }}
              </span>
              <span v-if="row.min_stock > 0" class="min-stock-info">
                (阈值: {{ row.min_stock }})
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'stored' ? 'success' : 'warning'" size="small">
              {{ row.status === 'stored' ? '在库' : '已取用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="过期日期" width="120">
          <template #default="{ row }">
            <span v-if="row.expire_date" :class="{ 'expire-soon': isExpireSoon(row) }">
              {{ row.expire_date }}
            </span>
            <span v-else class="text-light">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleViewDetail(row)">
              查看
            </el-button>
            <el-button size="small" type="primary" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              size="small"
              type="success"
              link
              @click="handleBorrow(row)"
              :disabled="row.quantity <= 0"
            >
              取用
            </el-button>
            <el-button
              size="small"
              type="warning"
              link
              @click="handleReturn(row)"
            >
              归还
            </el-button>
            <el-button size="small" type="warning" link @click="addSingleItemToList(row)">
              购物
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">
              删除
            </el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑物品' : '添加物品'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入物品名称" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            :show-file-list="false"
            :before-upload="beforeImageUpload"
            :http-request="handleImageUpload"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <div v-if="form.image" class="image-preview">
              <img :src="form.image" />
              <div class="image-remove" @click.stop="removeImage">
                <el-icon><Close /></el-icon>
              </div>
            </div>
            <el-button v-else type="default" :icon="PictureFilled">
              上传图片
            </el-button>
          </el-upload>
          <div class="upload-tip">支持 JPG/PNG/GIF/WebP 格式，单张不超过 5MB</div>
        </el-form-item>
        <el-form-item label="收纳盒">
          <el-select v-model="form.box_id" placeholder="选择收纳盒" clearable style="width: 100%">
            <el-option
              v-for="box in boxList"
              :key="box.id"
              :label="box.name"
              :value="box.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <div class="category-select-wrapper">
            <el-select
              v-model="form.category"
              placeholder="选择分类"
              clearable
              style="flex: 1"
              @change="onCategorySelectChange"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.name"
              >
                <div class="category-option">
                  <span class="category-option-icon">{{ cat.icon || '📦' }}</span>
                  <span class="category-option-name">{{ cat.name }}</span>
                </div>
              </el-option>
            </el-select>
            <el-button :icon="Plus" @click="openNewCategoryDialog">
              新增
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="0" />
          <span style="margin-left: 8px">
            <el-input v-model="form.unit" placeholder="单位" style="width: 80px" />
          </span>
        </el-form-item>
        <el-form-item label="最小库存">
          <el-input-number v-model="form.min_stock" :min="0" />
          <span style="margin-left: 8px; color: var(--color-text-light); font-size: 12px">
            当数量 ≤ 此值时自动标记待补货，0 表示不启用
          </span>
        </el-form-item>
        <el-form-item label="过期日期">
          <el-date-picker
            v-model="form.expire_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="体积估算">
          <el-input-number v-model="form.estimated_size" :min="0" :precision="2" :step="100" />
          <span style="margin-left: 8px; color: var(--color-text-light); font-size: 12px">
            cm³，用于空间利用率计算（选填）
          </span>
        </el-form-item>
        <el-form-item label="估值">
          <el-input-number v-model="form.estimated_value" :min="0" :precision="2" :step="10" />
          <span style="margin-left: 8px; color: var(--color-text-light); font-size: 12px">
            元，用于资产价值统计（选填）
          </span>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="物品描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="borrowDialogVisible" title="批量取用" width="400px">
      <el-form label-width="80px">
        <el-form-item label="物品">
          <el-select v-model="borrowForm.item_id" placeholder="选择物品" style="width: 100%">
            <el-option
              v-for="item in storedItems"
              :key="item.id"
              :label="`${item.name} (${item.quantity}${item.unit})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="borrowForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="borrowForm.remark"
            type="textarea"
            :rows="2"
            placeholder="选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="borrowDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="borrowSubmitLoading" @click="submitBorrow">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showAddToListDialog"
      title="加入购物清单"
      width="450px"
      @close="resetAddToListForm"
    >
      <el-form label-width="100px">
        <el-form-item label="选择清单">
          <el-select
            v-model="addToListForm.list_id"
            placeholder="选择购物清单"
            style="width: 100%"
            @change="onListSelectChange"
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
        <el-form-item label="补货数量">
          <el-input-number v-model="addToListForm.quantity" :min="1" />
          <span style="margin-left: 8px">倍</span>
        </el-form-item>
        <el-form-item label="添加数量">
          <span style="color: var(--color-text-light);">
            共 {{ selectedItems.length }} 个物品将被添加
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddToListDialog = false">取消</el-button>
        <el-button type="primary" :loading="addToListLoading" @click="confirmAddToList">
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      :title="currentItem?.name || '物品详情'"
      width="500px"
    >
      <div v-if="currentItem" class="detail-content">
        <div v-if="currentItem.image" class="detail-image" @click="previewImage(currentItem.image)">
          <img :src="currentItem.image" :alt="currentItem.name" />
          <div class="zoom-hint">
            <el-icon><ZoomIn /></el-icon>
            点击放大
          </div>
        </div>
        <div v-else class="detail-image detail-image-placeholder">
          <el-icon :size="64"><Picture /></el-icon>
        </div>
        <el-descriptions :column="1" border style="margin-top: 20px">
          <el-descriptions-item label="名称">{{ currentItem.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">
            <div v-if="currentItem.category" class="category-tag-wrapper">
              <span
                class="category-color-dot"
                :style="{ backgroundColor: getCategoryColor(currentItem.category) }"
              ></span>
              <span class="category-tag-text">{{ currentItem.category }}</span>
            </div>
            <span v-else class="text-light">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="所在收纳盒">
            <span v-if="currentItem.box_name">{{ currentItem.box_name }}</span>
            <span v-else class="text-light">未归类</span>
            <div v-if="currentItem.box_location" class="sub-text">
              <el-icon><Location /></el-icon>
              {{ currentItem.box_location }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="数量">{{ currentItem.quantity }} {{ currentItem.unit }}</el-descriptions-item>
          <el-descriptions-item label="最小库存">
            <span v-if="currentItem.min_stock > 0">{{ currentItem.min_stock }} {{ currentItem.unit }}</span>
            <span v-else class="text-light">未设置</span>
          </el-descriptions-item>
          <el-descriptions-item label="补货状态">
            <el-tag
              v-if="currentItem.need_restock === 1 || currentItem.need_restock === true"
              size="small"
              type="danger"
              effect="dark"
            >
              待补货
            </el-tag>
            <el-tag v-else size="small" type="success">
              库存正常
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentItem.status === 'stored' ? 'success' : 'warning'" size="small">
              {{ currentItem.status === 'stored' ? '在库' : '已取用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="过期日期">
            <span v-if="currentItem.expire_date" :class="{ 'expire-soon': isExpireSoon(currentItem) }">
              {{ currentItem.expire_date }}
            </span>
            <span v-else class="text-light">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="描述">
            <span v-if="currentItem.description">{{ currentItem.description }}</span>
            <span v-else class="text-light">-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit(currentItem); detailDialogVisible = false">
          编辑
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imagePreviewVisible"
      :title="'图片预览'"
      width="auto"
      align-center
      destroy-on-close
    >
      <img v-if="previewImageUrl" :src="previewImageUrl" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto;" />
    </el-dialog>

    <el-dialog
      v-model="showCategoryDialog"
      title="新增分类"
      width="420px"
      @close="showCategoryDialog = false"
    >
      <el-form label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCategoryForm.name" placeholder="请输入分类名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="图标">
          <div class="icon-selector">
            <div
              v-for="icon in categoryIconOptions"
              :key="icon"
              class="icon-option"
              :class="{ active: newCategoryForm.icon === icon }"
              @click="newCategoryForm.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-selector">
            <div
              v-for="color in categoryColorOptions"
              :key="color"
              class="color-option"
              :class="{ active: newCategoryForm.color === color }"
              :style="{ backgroundColor: color }"
              @click="newCategoryForm.color = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Location, ShoppingCart, Picture, PictureFilled, Close, ZoomIn, Warning } from '@element-plus/icons-vue'
import { getItemList, getCategories, createItem, updateItem, deleteItem, uploadItemImage } from '@/api/items'
import { getAllBoxes } from '@/api/boxes'
import { borrowItem, returnItem } from '@/api/records'
import { getShoppingLists, addFromLowStock, createShoppingList } from '@/api/shopping'
import { createCategory, getCategories as getCategoryList } from '@/api/categories'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const items = ref([])
const categories = ref([])
const boxList = ref([])

const activeTab = ref('all')
const restockCount = ref(0)

const detailDialogVisible = ref(false)
const currentItem = ref(null)
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const borrowDialogVisible = ref(false)
const borrowSubmitLoading = ref(false)
const borrowForm = reactive({
  item_id: null,
  quantity: 1,
  remark: ''
})

const selectedItems = ref([])
const shoppingLists = ref([])
const showAddToListDialog = ref(false)
const highlightId = ref(null)
const addToListLoading = ref(false)
let singleAddItem = null
const addToListForm = reactive({
  list_id: null,
  new_list_name: '',
  quantity: 2
})

const showCategoryDialog = ref(false)
const newCategoryForm = reactive({
  name: '',
  icon: '',
  color: ''
})
const categoryIconOptions = [
  '📦', '🍎', '🥬', '👕', '📚', '💊', '🧴', '🔧',
  '🎮', '🎁', '🌸', '🍳', '☕', '🧦', '👟', '💄'
]
const categoryColorOptions = [
  '#B8D8BA', '#D4B896', '#F5E6C8', '#8FC493',
  '#B8956E', '#FFB6C1', '#87CEEB', '#DDA0DD',
  '#98FB98', '#FFD700', '#FFA07A', '#20B2AA'
]

const filters = reactive({
  keyword: '',
  category: '',
  box_id: '',
  status: '',
  expire_soon: false,
  low_stock: '',
  need_restock: false
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const form = reactive({
  id: null,
  name: '',
  box_id: null,
  category: '',
  category_id: null,
  quantity: 1,
  unit: '个',
  min_stock: 0,
  expire_date: '',
  estimated_size: 0,
  estimated_value: 0,
  description: '',
  image: ''
})

const rules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }]
}

const storedItems = computed(() => {
  return items.value.filter(item => item.status === 'stored' && item.quantity > 0)
})

const restockTabLabel = computed(() => {
  return restockCount.value > 0 ? `待补货 (${restockCount.value})` : '待补货'
})

function getCategoryColor(categoryName) {
  const cat = categories.value.find(c => c.name === categoryName)
  return cat?.color || '#B8D8BA'
}

function isLowStock(item) {
  if (item.min_stock && item.min_stock > 0) {
    return item.quantity <= item.min_stock
  }
  return item.quantity <= 2
}

function handleTabChange(tab) {
  filters.status = ''
  filters.expire_soon = false
  filters.low_stock = ''
  filters.need_restock = false

  switch (tab) {
    case 'stored':
      filters.status = 'stored'
      break
    case 'borrowed':
      filters.status = 'borrowed'
      break
    case 'expire_soon':
      filters.expire_soon = true
      break
    case 'need_restock':
      filters.need_restock = true
      break
  }
  pagination.page = 1
  loadList()
}

function isExpireSoon(item) {
  if (!item.expire_date) return false
  const expire = new Date(item.expire_date)
  const now = new Date()
  const diff = (expire - now) / (1000 * 60 * 60 * 24)
  return diff <= 30 && diff >= 0
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      category: filters.category || undefined,
      box_id: filters.box_id || undefined,
      status: filters.status || undefined,
      expire_soon: filters.expire_soon || undefined,
      low_stock: filters.low_stock === 'low' ? true : undefined,
      need_restock: filters.need_restock ? true : undefined
    }
    const res = await getItemList(params)
    items.value = res.list
    pagination.total = res.total
    selectedItems.value = []
    
    if (activeTab.value === 'all') {
      loadRestockCount()
    }
    
    scrollToHighlightedItem()
  } finally {
    loading.value = false
  }
}

async function loadRestockCount() {
  try {
    const params = {
      page: 1,
      pageSize: 1,
      need_restock: true
    }
    const res = await getItemList(params)
    restockCount.value = res.total
  } catch (e) {
    console.error(e)
  }
}

async function loadCategories() {
  const res = await getCategoryList()
  categories.value = res.list || []
}

function openNewCategoryDialog() {
  newCategoryForm.name = ''
  newCategoryForm.icon = '📦'
  newCategoryForm.color = '#B8D8BA'
  showCategoryDialog.value = true
}

function onCategorySelectChange(val) {
  const cat = categories.value.find(c => c.name === val)
  if (cat) {
    form.category_id = cat.id
  } else {
    form.category_id = null
  }
}

async function handleCreateCategory() {
  if (!newCategoryForm.name?.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  
  try {
    const res = await createCategory(newCategoryForm)
    ElMessage.success('分类创建成功')
    showCategoryDialog.value = false
    await loadCategories()
    form.category = res.category.name
    form.category_id = res.category.id
  } catch (e) {
    console.error(e)
  }
}

async function loadBoxes() {
  const res = await getAllBoxes()
  boxList.value = res.list
}

function resetFilters() {
  filters.keyword = ''
  filters.category = ''
  filters.box_id = ''
  filters.status = ''
  filters.expire_soon = false
  filters.low_stock = ''
  filters.need_restock = false
  activeTab.value = 'all'
  pagination.page = 1
  highlightId.value = null
  loadList()
}

function getRowClassName({ row }) {
  if (highlightId.value && row.id === highlightId.value) {
    return 'highlight-row'
  }
  return ''
}

async function scrollToHighlightedItem() {
  if (!highlightId.value) return
  await nextTick()
  const row = document.querySelector('.highlight-row')
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      highlightId.value = null
    }, 3000)
  }
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
}

function handleViewDetail(item) {
  currentItem.value = item
  detailDialogVisible.value = true
}

function handleViewImage(item) {
  if (item.image) {
    previewImage(item.image)
  } else {
    currentItem.value = item
    detailDialogVisible.value = true
  }
}

function previewImage(url) {
  previewImageUrl.value = url
  imagePreviewVisible.value = true
}

function beforeImageUpload(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG/PNG/GIF/WebP 格式的图片')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleImageUpload(options) {
  try {
    const res = await uploadItemImage(options.file)
    form.image = res.imageUrl
    ElMessage.success('上传成功')
  } catch (error) {
    console.error(error)
  }
}

function removeImage() {
  form.image = ''
}

function handleEdit(item) {
  isEdit.value = true
  form.id = item.id
  form.name = item.name
  form.box_id = item.box_id
  form.category = item.category
  form.category_id = item.category_id || null
  form.quantity = item.quantity
  form.unit = item.unit || '个'
  form.min_stock = item.min_stock || 0
  form.expire_date = item.expire_date
  form.estimated_size = item.estimated_size || 0
  form.estimated_value = item.estimated_value || 0
  form.description = item.description
  form.image = item.image || ''
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  form.id = null
  form.name = ''
  form.box_id = null
  form.category = ''
  form.category_id = null
  form.quantity = 1
  form.unit = '个'
  form.min_stock = 0
  form.expire_date = ''
  form.estimated_size = 0
  form.estimated_value = 0
  form.description = ''
  form.image = ''
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateItem(form.id, form)
      ElMessage.success('更新成功')
    } else {
      await createItem(form)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadList()
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

function handleDelete(item) {
  ElMessageBox.confirm(`确定要删除物品"${item.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteItem(item.id)
      ElMessage.success('删除成功')
      loadList()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function handleBorrow(item) {
  ElMessageBox.prompt(`请输入取用数量（当前：${item.quantity} ${item.unit}）`, '取用物品', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^\d+$/,
    inputErrorMessage: '请输入有效数字',
    inputValue: '1'
  }).then(async ({ value }) => {
    try {
      const qty = parseInt(value)
      if (qty > item.quantity) {
        ElMessage.error('取用数量不能超过当前数量')
        return
      }
      await borrowItem({ item_id: item.id, quantity: qty })
      ElMessage.success('取用成功')
      loadList()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function handleReturn(item) {
  ElMessageBox.prompt(`请输入归还数量`, '归还物品', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^\d+$/,
    inputErrorMessage: '请输入有效数字',
    inputValue: '1'
  }).then(async ({ value }) => {
    try {
      const qty = parseInt(value)
      await returnItem({ item_id: item.id, quantity: qty })
      ElMessage.success('归还成功')
      loadList()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function showBorrowDialog() {
  borrowForm.item_id = null
  borrowForm.quantity = 1
  borrowForm.remark = ''
  borrowDialogVisible.value = true
}

async function submitBorrow() {
  if (!borrowForm.item_id) {
    ElMessage.warning('请选择物品')
    return
  }
  
  try {
    borrowSubmitLoading.value = true
    await borrowItem(borrowForm)
    ElMessage.success('取用登记成功')
    borrowDialogVisible.value = false
    loadList()
  } catch (error) {
    console.error(error)
  } finally {
    borrowSubmitLoading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedItems.value = selection
}

async function loadShoppingLists() {
  try {
    const res = await getShoppingLists()
    shoppingLists.value = res.list
    if (res.list.length > 0) {
      addToListForm.list_id = res.list[0].id
    }
  } catch (error) {
    console.error(error)
  }
}

function addSingleItemToList(item) {
  singleAddItem = item
  addToListForm.list_id = shoppingLists.value.length > 0 ? shoppingLists.value[0].id : null
  addToListForm.new_list_name = ''
  addToListForm.quantity = 2
  showAddToListDialog.value = true
}

function resetAddToListForm() {
  singleAddItem = null
  addToListForm.list_id = shoppingLists.value.length > 0 ? shoppingLists.value[0].id : null
  addToListForm.new_list_name = ''
  addToListForm.quantity = 2
}

function onListSelectChange() {
  if (addToListForm.list_id) {
    addToListForm.new_list_name = ''
  }
}

async function confirmAddToList() {
  const itemsToAdd = singleAddItem ? [singleAddItem] : selectedItems.value
  
  if (itemsToAdd.length === 0) {
    ElMessage.warning('请选择要添加的物品')
    return
  }

  let listId = addToListForm.list_id
  
  try {
    addToListLoading.value = true

    if (!listId) {
      if (!addToListForm.new_list_name) {
        ElMessage.warning('请选择或创建购物清单')
        return
      }
      const res = await createShoppingList({ name: addToListForm.new_list_name })
      listId = res.list.id
    }

    const itemIds = itemsToAdd.map(item => item.id)
    await addFromLowStock({ list_id: listId, item_ids: itemIds })
    
    ElMessage.success(`成功添加 ${itemsToAdd.length} 个物品到购物清单`)
    showAddToListDialog.value = false
    selectedItems.value = []
  } catch (error) {
    console.error(error)
  } finally {
    addToListLoading.value = false
  }
}

async function generateRestockList() {
  try {
    const params = {
      page: 1,
      pageSize: 1000,
      need_restock: true
    }
    const res = await getItemList(params)
    const restockItems = res.list
    
    if (restockItems.length === 0) {
      ElMessage.info('当前没有需要补货的物品')
      return
    }
    
    const action = await ElMessageBox.confirm(
      `共找到 ${restockItems.length} 个需要补货的物品，请选择操作方式：`,
      '生成补货清单',
      {
        confirmButtonText: '复制到剪贴板',
        cancelButtonText: '导出文本文件',
        distinguishCancelAndClose: true,
        type: 'info'
      }
    ).catch(() => 'export')

    let content = '===== 补货清单 =====\n'
    content += `生成时间: ${new Date().toLocaleString()}\n`
    content += `物品数量: ${restockItems.length}\n\n`
    
    restockItems.forEach((item, idx) => {
      const suggestQty = Math.max(
        (item.min_stock || 0) * 2 - item.quantity,
        (item.min_stock || 0) - item.quantity,
        1
      )
      content += `${idx + 1}. ${item.name}\n`
      content += `   当前库存: ${item.quantity}${item.unit || '个'}\n`
      content += `   最小阈值: ${item.min_stock || 0}${item.unit || '个'}\n`
      content += `   建议补货: ${suggestQty}${item.unit || '个'}\n`
      if (item.box_name) {
        content += `   存放位置: ${item.box_name}${item.box_location ? ' (' + item.box_location + ')' : ''}\n`
      }
      if (item.category) {
        content += `   分类: ${item.category}\n`
      }
      content += '\n'
    })

    if (action === 'confirm') {
      await navigator.clipboard.writeText(content)
      ElMessage.success('补货清单已复制到剪贴板')
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `补货清单_${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      ElMessage.success('补货清单已导出')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('生成补货清单失败')
  }
}

function handleRouteQuery() {
  if (route.query.keyword) {
    filters.keyword = route.query.keyword
  }
  if (route.query.box_id) {
    filters.box_id = route.query.box_id
  }
  if (route.query.category) {
    filters.category = route.query.category
  }
  if (route.query.highlightId) {
    highlightId.value = parseInt(route.query.highlightId)
  }
  if (route.query.need_restock === 'true') {
    activeTab.value = 'need_restock'
    filters.need_restock = true
  }
  if (route.query.status) {
    if (route.query.status === 'stored') {
      activeTab.value = 'stored'
      filters.status = 'stored'
    } else if (route.query.status === 'borrowed') {
      activeTab.value = 'borrowed'
      filters.status = 'borrowed'
    }
  }
  if (route.query.expire_soon === 'true') {
    activeTab.value = 'expire_soon'
    filters.expire_soon = true
  }
}

onMounted(() => {
  handleRouteQuery()
  loadCategories()
  loadBoxes()
  loadList()
  loadShoppingLists()
})

watch(
  () => route.query,
  () => {
    handleRouteQuery()
    if (route.query.highlightId) {
      loadList()
    }
  }
)
</script>

<style scoped>
.filter-tabs {
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.item-name-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.restock-tag {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.qty-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.qty-low {
  color: var(--color-danger);
  font-weight: 600;
}

.min-stock-info {
  font-size: 12px;
  color: var(--color-text-light);
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

.expire-soon {
  color: var(--color-danger);
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.item-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-light);
  cursor: pointer;
  border: 1px solid var(--color-gray);
  margin: 0 auto;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumb .default-icon {
  font-size: 24px;
  color: var(--color-text-light);
}

.image-preview {
  width: 120px;
  height: 80px;
  border: 1px solid var(--color-gray);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.image-remove:hover {
  background: rgba(0, 0, 0, 0.7);
}

.upload-tip {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 6px;
}

.detail-content {
  padding: 0 10px;
}

.detail-image {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-light);
  position: relative;
  cursor: pointer;
  border: 1px solid var(--color-gray);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-image-placeholder {
  cursor: default;
  color: var(--color-text-light);
}

.zoom-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.highlight-row) {
  background-color: rgba(var(--color-primary-rgb), 0.15) !important;
  animation: highlight-pulse 1.5s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%, 100% {
    background-color: rgba(var(--color-primary-rgb), 0.15);
  }
  50% {
    background-color: rgba(var(--color-primary-rgb), 0.3);
  }
}

.category-select-wrapper {
  display: flex;
  gap: 8px;
  width: 100%;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-option-icon {
  font-size: 16px;
}

.category-option-name {
  font-size: 14px;
}

.category-option-count {
  font-size: 12px;
  color: var(--color-text-light);
  margin-left: auto;
}

.category-tag-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-tag-text {
  font-size: 13px;
  color: var(--color-text);
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-gray);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  background: var(--color-white);
}

.icon-option:hover {
  border-color: var(--color-primary);
}

.icon-option.active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.1);
}

.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-white);
}
</style>
