<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">
          <el-icon><Tickets /></el-icon>
          标签模板管理
        </h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新建模板
      </el-button>
    </div>

    <div class="template-grid">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="template-card"
        :class="{ active: tpl.is_default }"
      >
        <div class="template-preview" :style="getPreviewStyle(tpl)">
          <div class="preview-title">标签预览</div>
          <div class="preview-sub">收纳盒名称</div>
        </div>
        <div class="template-info">
          <div class="template-name">
            {{ tpl.name }}
            <el-tag v-if="tpl.is_default" type="success" size="small" style="margin-left: 8px;">
              默认
            </el-tag>
          </div>
          <div class="template-actions">
            <el-button size="small" type="primary" link @click="handleEdit(tpl)">
              编辑
            </el-button>
            <el-button
              size="small"
              type="success"
              link
              @click="setDefault(tpl)"
              :disabled="tpl.is_default"
            >
              设为默认
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(tpl)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="templates.length === 0" class="empty-state">
      <div class="empty-icon">🏷️</div>
      <p>暂无标签模板，点击右上角新建</p>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新建模板'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.is_default" />
        </el-form-item>
        <el-divider content-position="left">样式设置</el-divider>
        <el-form-item label="字体大小">
          <el-slider v-model="form.template_data.fontSize" :min="10" :max="24" />
        </el-form-item>
        <el-form-item label="字体颜色">
          <el-color-picker v-model="form.template_data.fontColor" />
        </el-form-item>
        <el-form-item label="背景颜色">
          <el-color-picker v-model="form.template_data.bgColor" />
        </el-form-item>
        <el-form-item label="边框颜色">
          <el-color-picker v-model="form.template_data.borderColor" />
        </el-form-item>
        <el-form-item label="显示二维码">
          <el-switch v-model="form.template_data.showQrCode" />
        </el-form-item>
        <el-form-item label="显示日期">
          <el-switch v-model="form.template_data.showDate" />
        </el-form-item>
        <el-form-item label="标签宽度">
          <el-slider v-model="form.template_data.width" :min="100" :max="400" />
        </el-form-item>
        <el-form-item label="标签高度">
          <el-slider v-model="form.template_data.height" :min="50" :max="200" />
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
import { ArrowLeft, Tickets, Plus } from '@element-plus/icons-vue'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/api/labels'

const router = useRouter()
const formRef = ref()
const templates = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)

const form = reactive({
  id: null,
  name: '',
  is_default: false,
  template_data: {
    fontSize: 14,
    fontColor: '#5D4E37',
    bgColor: '#FDF6E3',
    borderColor: '#8B7355',
    showQrCode: true,
    showDate: true,
    width: 200,
    height: 100
  }
})

const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

function getPreviewStyle(tpl) {
  const data = tpl.template_data
  return {
    fontSize: data.fontSize + 'px',
    color: data.fontColor,
    backgroundColor: data.bgColor,
    borderColor: data.borderColor,
    width: data.width + 'px',
    height: data.height + 'px'
  }
}

async function loadTemplates() {
  try {
    const res = await getTemplates()
    templates.value = res.list
  } catch (error) {
    console.error(error)
  }
}

function goBack() {
  router.back()
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
}

function handleEdit(tpl) {
  isEdit.value = true
  form.id = tpl.id
  form.name = tpl.name
  form.is_default = !!tpl.is_default
  Object.assign(form.template_data, tpl.template_data || {})
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  form.id = null
  form.name = ''
  form.is_default = false
  form.template_data = {
    fontSize: 14,
    fontColor: '#5D4E37',
    bgColor: '#FDF6E3',
    borderColor: '#8B7355',
    showQrCode: true,
    showDate: true,
    width: 200,
    height: 100
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateTemplate(form.id, form)
      ElMessage.success('更新成功')
    } else {
      await createTemplate(form)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadTemplates()
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

function setDefault(tpl) {
  ElMessageBox.confirm(`确定将"${tpl.name}"设为默认模板吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(async () => {
    try {
      await updateTemplate(tpl.id, {
        name: tpl.name,
        template_data: tpl.template_data,
        is_default: true
      })
      ElMessage.success('设置成功')
      loadTemplates()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function handleDelete(tpl) {
  if (tpl.is_default) {
    ElMessage.warning('默认模板不能删除')
    return
  }
  
  ElMessageBox.confirm(`确定删除模板"${tpl.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteTemplate(tpl.id)
      ElMessage.success('删除成功')
      loadTemplates()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.template-card {
  background: var(--color-white);
  border-radius: 12px;
  border: 2px solid var(--color-gray);
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(139, 115, 85, 0.15);
  transform: translateY(-2px);
}

.template-card.active {
  border-color: var(--color-light-green-dark);
  box-shadow: 0 0 0 3px rgba(143, 196, 147, 0.2);
}

.template-preview {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-gray);
  border-bottom-width: 1px;
  margin: 20px auto;
  width: 80%;
  border: 2px solid;
  border-radius: 8px;
}

.preview-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.preview-sub {
  font-size: 0.8em;
  opacity: 0.7;
}

.template-info {
  padding: 16px;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: 12px;
}

.template-actions {
  display: flex;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-light);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
</style>
