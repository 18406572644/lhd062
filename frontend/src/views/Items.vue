<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Goods /></el-icon>
        物品管理
      </h2>
      <div class="header-actions">
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
        <el-form-item>
          <el-button type="primary" @click="loadList">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="items" v-loading="loading" stripe>
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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Location } from '@element-plus/icons-vue'
import { getItemList, getCategories, createItem, updateItem, deleteItem } from '@/api/items'
import { getAllBoxes } from '@/api/boxes'
import { borrowItem, returnItem } from '@/api/records'

const route = useRoute()
const formRef = ref()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const items = ref([])
const categories = ref([])
const boxList = ref([])

const borrowDialogVisible = ref(false)
const borrowSubmitLoading = ref(false)
const borrowForm = reactive({
  item_id: null,
  quantity: 1,
  remark: ''
})

const filters = reactive({
  keyword: '',
  category: '',
  box_id: '',
  status: '',
  expire_soon: false
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
  description: ''
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
      expire_soon: filters.expire_soon || undefined
    }
    const res = await getItemList(params)
    items.value = res.list
    pagination.total = res.total
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
  pagination.page = 1
  loadList()
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
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
