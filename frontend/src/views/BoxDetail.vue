<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">
          <el-icon><Box /></el-icon>
          {{ box?.name || '收纳盒详情' }}
        </h2>
      </div>
      <div class="header-right">
        <el-button :icon="Edit" @click="handleEdit">编辑</el-button>
        <el-button type="primary" :icon="Plus" @click="handleAddItem">添加物品</el-button>
        <el-button type="warning" :icon="Printer" @click="printLabels">打印标签</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="box-info-card">
          <div class="box-image-large" :style="{ backgroundColor: box?.color }">
            <img v-if="box?.image" :src="box.image" :alt="box.name" />
            <span v-else>📦</span>
          </div>
          <div class="box-details">
            <h3>{{ box?.name }}</h3>
            <div class="detail-item">
              <el-icon><Location /></el-icon>
              <span>{{ box?.location || '未设置位置' }}</span>
            </div>
            <div class="detail-item" v-if="box?.width && box?.height">
              <el-icon><Grid /></el-icon>
              <span>尺寸：{{ box.width }} × {{ box.height }} × {{ box.depth }} cm</span>
            </div>
            <div class="detail-item">
              <el-icon><Goods /></el-icon>
              <span>共 {{ box?.item_count || 0 }} 件物品（在库 {{ box?.stored_count || 0 }} 件）</span>
            </div>
            <div class="detail-item" v-if="box?.description">
              <el-icon><Document /></el-icon>
              <span>{{ box.description }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>物品清单</span>
              <el-input
                v-model="keyword"
                placeholder="搜索物品"
                size="small"
                style="width: 200px"
                clearable
                @input="filterItems"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </template>

          <el-table :data="filteredItems" style="width: 100%">
            <el-table-column label="图片" width="70" align="center">
              <template #default="{ row }">
                <div class="item-thumb" @click="handlePreviewImage(row)">
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
            <el-table-column prop="quantity" label="数量" width="100">
              <template #default="{ row }">
                {{ row.quantity }} {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'stored' ? 'success' : 'warning'" size="small">
                  {{ row.status === 'stored' ? '在库' : '已取用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="expire_date" label="过期日期" width="120">
              <template #default="{ row }">
                <span v-if="row.expire_date">{{ row.expire_date }}</span>
                <span v-else class="text-light">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="handleEditItem(row)">
                  编辑
                </el-button>
                <el-button size="small" type="success" link @click="handleBorrow(row)" :disabled="row.quantity <= 0">
                  取用
                </el-button>
                <el-button size="small" type="danger" link @click="handleDeleteItem(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="items.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>收纳盒里还没有物品</p>
            <el-button type="primary" size="small" @click="handleAddItem">添加物品</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="itemDialogVisible"
      :title="isItemEdit ? '编辑物品' : '添加物品'"
      width="500px"
      @close="resetItemForm"
    >
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="itemForm.name" placeholder="请输入物品名称" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            :show-file-list="false"
            :before-upload="beforeImageUpload"
            :http-request="handleImageUpload"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <div v-if="itemForm.image" class="image-preview">
              <img :src="itemForm.image" />
              <div class="image-remove" @click.stop="removeItemImage">
                <el-icon><Close /></el-icon>
              </div>
            </div>
            <el-button v-else type="default" :icon="PictureFilled">
              上传图片
            </el-button>
          </el-upload>
          <div class="upload-tip">支持 JPG/PNG/GIF/WebP 格式，单张不超过 5MB</div>
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="itemForm.category" placeholder="如：食品、日用品" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="itemForm.quantity" :min="1" />
          <span style="margin-left: 8px">
            <el-input v-model="itemForm.unit" placeholder="单位" style="width: 80px" />
          </span>
        </el-form-item>
        <el-form-item label="过期日期">
          <el-date-picker
            v-model="itemForm.expire_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="itemForm.description"
            type="textarea"
            :rows="3"
            placeholder="物品描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="itemSubmitLoading" @click="handleItemSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imagePreviewVisible"
      title="图片预览"
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Edit, Plus, Printer, Location, Grid, Goods, Document, Search, Picture, PictureFilled, Close
} from '@element-plus/icons-vue'
import { getBoxDetail, updateBox } from '@/api/boxes'
import { createItem, updateItem, deleteItem, uploadItemImage } from '@/api/items'
import { borrowItem, returnItem } from '@/api/records'

const route = useRoute()
const router = useRouter()
const box = ref(null)
const items = ref([])
const keyword = ref('')
const itemDialogVisible = ref(false)
const isItemEdit = ref(false)
const itemFormRef = ref()
const itemSubmitLoading = ref(false)

const boxId = computed(() => route.params.id)

const filteredItems = computed(() => {
  if (!keyword.value) return items.value
  const kw = keyword.value.toLowerCase()
  return items.value.filter(item =>
    item.name.toLowerCase().includes(kw) ||
    (item.category && item.category.toLowerCase().includes(kw))
  )
})

const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const itemForm = reactive({
  id: null,
  name: '',
  category: '',
  quantity: 1,
  unit: '个',
  expire_date: '',
  description: '',
  image: ''
})

const itemRules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }]
}

function handlePreviewImage(item) {
  if (item.image) {
    previewImageUrl.value = item.image
    imagePreviewVisible.value = true
  }
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
    itemForm.image = res.imageUrl
    ElMessage.success('上传成功')
  } catch (error) {
    console.error(error)
  }
}

function removeItemImage() {
  itemForm.image = ''
}

async function loadDetail() {
  try {
    const res = await getBoxDetail(boxId.value)
    box.value = res
    items.value = res.items || []
  } catch (error) {
    console.error(error)
  }
}

function goBack() {
  router.back()
}

function handleEdit() {
  ElMessage.info('请在收纳盒列表页编辑')
  router.push('/boxes')
}

function handleAddItem() {
  isItemEdit.value = false
  itemDialogVisible.value = true
}

function handleEditItem(item) {
  isItemEdit.value = true
  itemForm.id = item.id
  itemForm.name = item.name
  itemForm.category = item.category
  itemForm.quantity = item.quantity
  itemForm.unit = item.unit || '个'
  itemForm.expire_date = item.expire_date
  itemForm.description = item.description
  itemForm.image = item.image || ''
  itemDialogVisible.value = true
}

function resetItemForm() {
  itemFormRef.value?.resetFields()
  itemForm.id = null
  itemForm.name = ''
  itemForm.category = ''
  itemForm.quantity = 1
  itemForm.unit = '个'
  itemForm.expire_date = ''
  itemForm.description = ''
  itemForm.image = ''
}

async function handleItemSubmit() {
  if (!itemFormRef.value) return
  
  try {
    await itemFormRef.value.validate()
    itemSubmitLoading.value = true
    
    if (isItemEdit.value) {
      await updateItem(itemForm.id, { ...itemForm, box_id: boxId.value })
      ElMessage.success('更新成功')
    } else {
      await createItem({ ...itemForm, box_id: boxId.value })
      ElMessage.success('添加成功')
    }
    
    itemDialogVisible.value = false
    loadDetail()
  } catch (error) {
    console.error(error)
  } finally {
    itemSubmitLoading.value = false
  }
}

function handleDeleteItem(item) {
  ElMessageBox.confirm(`确定要删除物品"${item.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteItem(item.id)
      ElMessage.success('删除成功')
      loadDetail()
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
      loadDetail()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function printLabels() {
  router.push({
    path: '/labels',
    query: { box_id: boxId.value }
  })
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.box-info-card {
  padding: 20px;
}

.box-image-large {
  height: 200px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  margin-bottom: 20px;
  overflow: hidden;
}

.box-image-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.box-details h3 {
  font-size: 20px;
  color: var(--color-brown-dark);
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--color-text);
  font-size: 14px;
}

.detail-item .el-icon {
  color: var(--color-light-brown-dark);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  font-weight: 500;
}

.text-light {
  color: var(--color-text-light);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
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
  font-size: 20px;
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
</style>
