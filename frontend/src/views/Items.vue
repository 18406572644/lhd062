<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Goods /></el-icon>
        物品管理
      </h2>
      <div class="header-actions">
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
            style="width: 150px"
            @change="loadList"
          >
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
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
      <el-table :data="items" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <div class="item-thumb" @click="handleViewImage(row)">
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
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small" type="info">{{ row.category }}</el-tag>
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
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
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
          <el-input v-model="form.category" placeholder="如：食品、日用品" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="0" />
          <span style="margin-left: 8px">
            <el-input v-model="form.unit" placeholder="单位" style="width: 80px" />
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
            <el-tag v-if="currentItem.category" size="small" type="info">{{ currentItem.category }}</el-tag>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Location, ShoppingCart, Picture, PictureFilled, Close, ZoomIn } from '@element-plus/icons-vue'
import { getItemList, getCategories, createItem, updateItem, deleteItem, uploadItemImage } from '@/api/items'
import { getAllBoxes } from '@/api/boxes'
import { borrowItem, returnItem } from '@/api/records'
import { getShoppingLists, addFromLowStock, createShoppingList } from '@/api/shopping'

const route = useRoute()
const formRef = ref()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const items = ref([])
const categories = ref([])
const boxList = ref([])

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
const addToListLoading = ref(false)
let singleAddItem = null
const addToListForm = reactive({
  list_id: null,
  new_list_name: '',
  quantity: 2
})

const filters = reactive({
  keyword: '',
  category: '',
  box_id: '',
  status: '',
  expire_soon: false,
  low_stock: ''
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
  quantity: 1,
  unit: '个',
  expire_date: '',
  description: '',
  image: ''
})

const rules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }]
}

const storedItems = computed(() => {
  return items.value.filter(item => item.status === 'stored' && item.quantity > 0)
})

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
      low_stock: filters.low_stock === 'low' ? true : undefined
    }
    const res = await getItemList(params)
    items.value = res.list
    pagination.total = res.total
    selectedItems.value = []
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  const res = await getCategories()
  categories.value = res.categories
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
  pagination.page = 1
  loadList()
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
  form.quantity = item.quantity
  form.unit = item.unit || '个'
  form.expire_date = item.expire_date
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
  form.quantity = 1
  form.unit = '个'
  form.expire_date = ''
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

onMounted(() => {
  if (route.query.keyword) {
    filters.keyword = route.query.keyword
  }
  if (route.query.box_id) {
    filters.box_id = route.query.box_id
  }
  loadCategories()
  loadBoxes()
  loadList()
  loadShoppingLists()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
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
</style>
