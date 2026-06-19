<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Box /></el-icon>
        收纳盒管理
      </h2>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新增收纳盒
      </el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索收纳盒名称"
            clearable
            @clear="loadList"
            @keyup.enter="loadList"
          />
        </el-form-item>
        <el-form-item label="位置">
          <el-input
            v-model="filters.location"
            placeholder="搜索位置"
            clearable
            @clear="loadList"
            @keyup.enter="loadList"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="boxes.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p>暂无收纳盒，点击右上角添加</p>
    </div>

    <div v-else class="box-grid">
      <div
        v-for="box in boxes"
        :key="box.id"
        class="box-card"
        @click="goToDetail(box.id)"
      >
        <div class="box-image" :style="{ backgroundColor: box.color }">
          <img v-if="box.image" :src="getImageUrl(box.image)" :alt="box.name" />
          <span v-else>📦</span>
        </div>
        <div class="box-info">
          <div class="box-name">{{ box.name }}</div>
          <div class="box-location">
            <el-icon><Location /></el-icon>
            {{ box.location || '未设置位置' }}
          </div>
          <div class="box-stats">
            <span>
              <el-icon><Goods /></el-icon>
              {{ box.item_count || 0 }} 件物品
            </span>
            <span v-if="box.width && box.height && box.depth">
              <el-icon><Grid /></el-icon>
              {{ box.width }}×{{ box.height }}×{{ box.depth }}cm
            </span>
          </div>
          <div class="box-actions" @click.stop>
            <el-button size="small" type="primary" link @click="handleEdit(box)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(box)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[8, 12, 20, 40]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadList"
        @current-change="loadList"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑收纳盒' : '新增收纳盒'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入收纳盒名称" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="form.location" placeholder="如：客厅电视柜左侧" />
        </el-form-item>
        <el-form-item label="尺寸">
          <div style="display: flex; gap: 8px; align-items: center;">
            <el-input v-model.number="form.width" placeholder="宽" style="width: 100px" />
            <el-input v-model.number="form.height" placeholder="高" style="width: 100px" />
            <el-input v-model.number="form.depth" placeholder="深" style="width: 100px" />
            <span style="color: var(--color-text-light)">cm</span>
          </div>
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="form.color" show-alpha />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="handleUpload"
            accept="image/*"
          >
            <div v-if="form.image" class="image-preview">
              <img :src="getImageUrl(form.image)" />
            </div>
            <el-button v-else type="default" :icon="PictureFilled">
              上传图片
            </el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="简单描述这个收纳盒的用途"
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Location, Goods, Grid, PictureFilled, Loading } from '@element-plus/icons-vue'
import { getBoxList, createBox, updateBox, deleteBox, uploadBoxImage } from '@/api/boxes'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const boxes = ref([])

const filters = reactive({
  keyword: '',
  location: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0
})

const form = reactive({
  id: null,
  name: '',
  location: '',
  width: null,
  height: null,
  depth: null,
  color: '#F5F5DC',
  image: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入收纳盒名称', trigger: 'blur' }]
}

function getImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return url
}

async function loadList() {
  loading.value = true
  try {
    const res = await getBoxList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      location: filters.location || undefined
    })
    boxes.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.location = ''
  pagination.page = 1
  loadList()
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
}

function handleEdit(box) {
  isEdit.value = true
  form.id = box.id
  form.name = box.name
  form.location = box.location
  form.width = box.width
  form.height = box.height
  form.depth = box.depth
  form.color = box.color
  form.image = box.image
  form.description = box.description
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  form.id = null
  form.name = ''
  form.location = ''
  form.width = null
  form.height = null
  form.depth = null
  form.color = '#F5F5DC'
  form.image = ''
  form.description = ''
}

function beforeUpload(file) {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleUpload(options) {
  try {
    const res = await uploadBoxImage(options.file)
    form.image = res.imageUrl
    ElMessage.success('上传成功')
  } catch (error) {
    console.error(error)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateBox(form.id, form)
      ElMessage.success('更新成功')
    } else {
      await createBox(form)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadList()
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

function handleDelete(box) {
  ElMessageBox.confirm(`确定要删除收纳盒"${box.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteBox(box.id)
      ElMessage.success('删除成功')
      loadList()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function goToDetail(id) {
  router.push(`/boxes/${id}`)
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.loading-state {
  text-align: center;
  padding: 60px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.image-preview {
  width: 120px;
  height: 80px;
  border: 1px solid var(--color-gray);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.box-actions {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-gray);
}
</style>
