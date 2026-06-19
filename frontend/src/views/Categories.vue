<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Folder /></el-icon>
        分类管理
      </h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          新增分类
        </el-button>
      </div>
    </div>

    <el-card v-loading="loading" class="categories-card">
      <div v-if="categories.length === 0" class="empty-state">
        <el-empty description="暂无分类，点击右上角添加分类" />
      </div>
      <div v-else class="categories-grid">
        <div
          v-for="(category, index) in categories"
          :key="category.id"
          class="category-item"
          :style="{ borderLeftColor: category.color || '#B8D8BA' }"
        >
          <div class="category-icon" :style="{ backgroundColor: category.color || '#B8D8BA' }">
            <span class="icon-text">{{ category.icon || '📦' }}</span>
          </div>
          <div class="category-info">
            <div class="category-name">{{ category.name }}</div>
            <div class="category-count">{{ category.item_count || 0 }} 件物品</div>
          </div>
          <div class="category-actions">
            <el-button size="small" type="primary" link @click="handleEdit(category)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(category)">
              删除
            </el-button>
          </div>
          <div class="sort-actions">
            <el-button
              size="small"
              text
              :icon="Top"
              :disabled="index === 0"
              @click="moveUp(index)"
            />
            <el-button
              size="small"
              text
              :icon="Bottom"
              :disabled="index === categories.length - 1"
              @click="moveDown(index)"
            />
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="420px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="图标">
          <div class="icon-selector">
            <div
              v-for="icon in iconOptions"
              :key="icon"
              class="icon-option"
              :class="{ active: form.icon === icon }"
              @click="form.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-selector">
            <div
              v-for="color in colorOptions"
              :key="color"
              class="color-option"
              :class="{ active: form.color === color }"
              :style="{ backgroundColor: color }"
              @click="form.color = color"
            />
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
          <span style="margin-left: 8px; color: var(--color-text-light); font-size: 12px">
            数字越小越靠前
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteDialogVisible"
      title="删除分类"
      width="450px"
      :close-on-click-modal="false"
    >
      <div v-if="deletingCategory">
        <p>
          确定要删除分类
          <el-tag type="warning">{{ deletingCategory.name }}</el-tag>
          吗？
        </p>
        <p v-if="deletingCategory.item_count > 0" class="warning-text">
          ⚠️ 该分类下有
          <strong>{{ deletingCategory.item_count }}</strong>
          件物品，请选择处理方式：
        </p>
        <div v-if="deletingCategory.item_count > 0" class="delete-options">
          <el-radio-group v-model="deleteOption">
            <el-radio value="move">移动到其他分类</el-radio>
            <el-radio value="delete">一并删除物品</el-radio>
          </el-radio-group>
          <el-select
            v-if="deleteOption === 'move'"
            v-model="targetCategoryId"
            placeholder="选择目标分类"
            style="width: 100%; margin-top: 12px;"
          >
            <el-option
              v-for="cat in otherCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          :loading="deleteLoading"
          :disabled="deleteOption === 'move' && !targetCategoryId"
          @click="confirmDelete"
        >
          确定删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Folder, Plus, Top, Bottom } from '@element-plus/icons-vue'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveItemsInCategory
} from '@/api/categories'

const loading = ref(false)
const submitLoading = ref(false)
const deleteLoading = ref(false)
const categories = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const deletingCategory = ref(null)
const deleteDialogVisible = ref(false)
const deleteOption = ref('move')
const targetCategoryId = ref(null)

const form = reactive({
  id: null,
  name: '',
  icon: '',
  color: '',
  sort_order: 0
})

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const iconOptions = [
  '📦', '🍎', '🥬', '👕', '📚', '💊', '🧴', '🔧',
  '🎮', '🎁', '🌸', '🍳', '☕', '🧦', '👟', '💄'
]

const colorOptions = [
  '#B8D8BA', '#D4B896', '#F5E6C8', '#8FC493',
  '#B8956E', '#FFB6C1', '#87CEEB', '#DDA0DD',
  '#98FB98', '#FFD700', '#FFA07A', '#20B2AA'
]

const otherCategories = computed(() => {
  if (!deletingCategory.value) return []
  return categories.value.filter(c => c.id !== deletingCategory.value.id)
})

async function loadCategories() {
  loading.value = true
  try {
    const res = await getCategories()
    categories.value = res.list || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
}

function handleEdit(category) {
  isEdit.value = true
  form.id = category.id
  form.name = category.name
  form.icon = category.icon || ''
  form.color = category.color || ''
  form.sort_order = category.sort_order || 0
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  form.id = null
  form.name = ''
  form.icon = ''
  form.color = ''
  form.sort_order = 0
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateCategory(form.id, form)
      ElMessage.success('更新成功')
    } else {
      await createCategory(form)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadCategories()
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

function handleDelete(category) {
  deletingCategory.value = category
  deleteOption.value = 'move'
  targetCategoryId.value = null
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (!deletingCategory.value) return
  
  const hasItems = deletingCategory.value.item_count > 0
  
  try {
    deleteLoading.value = true
    
    if (hasItems) {
      if (deleteOption.value === 'delete') {
        await moveItemsInCategory(deletingCategory.value.id, { delete_items: true })
      } else if (deleteOption.value === 'move') {
        if (!targetCategoryId.value) {
          ElMessage.warning('请选择目标分类')
          return
        }
        await moveItemsInCategory(deletingCategory.value.id, {
          target_category_id: targetCategoryId.value
        })
      }
    }
    
    await deleteCategory(deletingCategory.value.id)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    loadCategories()
  } catch (error) {
    console.error(error)
  } finally {
    deleteLoading.value = false
  }
}

async function moveUp(index) {
  if (index === 0) return
  const categoriesCopy = [...categories.value]
  const current = categoriesCopy[index]
  const prev = categoriesCopy[index - 1]
  
  const tempSort = current.sort_order
  current.sort_order = prev.sort_order
  prev.sort_order = tempSort
  
  try {
    await Promise.all([
      updateCategory(current.id, { sort_order: current.sort_order }),
      updateCategory(prev.id, { sort_order: prev.sort_order })
    ])
    categories.value = categoriesCopy.sort((a, b) => a.sort_order - b.sort_order)
  } catch (e) {
    console.error(e)
    loadCategories()
  }
}

async function moveDown(index) {
  if (index === categories.value.length - 1) return
  const categoriesCopy = [...categories.value]
  const current = categoriesCopy[index]
  const next = categoriesCopy[index + 1]
  
  const tempSort = current.sort_order
  current.sort_order = next.sort_order
  next.sort_order = tempSort
  
  try {
    await Promise.all([
      updateCategory(current.id, { sort_order: current.sort_order }),
      updateCategory(next.id, { sort_order: next.sort_order })
    ])
    categories.value = categoriesCopy.sort((a, b) => a.sort_order - b.sort_order)
  } catch (e) {
    console.error(e)
    loadCategories()
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
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
  gap: 12px;
}

.categories-card {
  padding: 20px;
}

.empty-state {
  padding: 40px 0;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.category-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--color-white);
  border-radius: 12px;
  border: 1px solid var(--color-gray);
  border-left: 4px solid #B8D8BA;
  transition: all 0.2s ease;
  gap: 12px;
}

.category-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.category-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background-color: #B8D8BA;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 24px;
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 13px;
  color: var(--color-text-light);
}

.category-actions {
  display: flex;
  gap: 4px;
}

.sort-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-gray);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
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
  gap: 10px;
}

.color-option {
  width: 32px;
  height: 32px;
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

.warning-text {
  color: var(--color-warning);
  margin: 12px 0;
}

.delete-options {
  margin-top: 12px;
  padding: 12px;
  background: var(--color-bg-light);
  border-radius: 8px;
}
</style>
