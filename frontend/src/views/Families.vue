<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><HomeFilled /></el-icon>
        家庭空间管理
      </h2>
      <div class="header-actions">
        <el-button type="warning" :icon="User" @click="showJoinDialog = true">
          加入家庭
        </el-button>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          创建家庭
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="families.length === 0" class="empty-state">
      <el-empty description="您还没有加入任何家庭" :image-size="120">
        <template #description>
          <p class="empty-desc">创建或加入家庭，与家人共享收纳空间</p>
        </template>
        <template #footer>
          <div class="empty-actions">
            <el-button type="warning" :icon="User" @click="showJoinDialog = true">
              加入家庭
            </el-button>
            <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
              创建家庭
            </el-button>
          </div>
        </template>
      </el-empty>
    </div>

    <div v-else class="family-grid">
      <el-card v-for="family in families" :key="family.id" class="family-card" shadow="hover">
        <div class="family-card-header">
          <div class="family-icon">
            <el-icon :size="28"><HomeFilled /></el-icon>
          </div>
          <div class="family-header-info">
            <h3 class="family-name">{{ family.name }}</h3>
            <el-tag :type="getRoleTagType(family.role)" size="small" effect="dark">
              {{ getRoleText(family.role) }}
            </el-tag>
          </div>
        </div>
        
        <div class="family-description">
          {{ family.description || '暂无描述' }}
        </div>

        <div class="family-meta">
          <div class="meta-item">
            <el-icon><User /></el-icon>
            <span>{{ family.member_count || 1 }} 位成员</span>
          </div>
          <div class="meta-item">
            <el-icon><Calendar /></el-icon>
            <span>加入于 {{ formatDate(family.joined_at) }}</span>
          </div>
        </div>

        <div class="family-actions">
          <el-button type="primary" :icon="Right" @click="handleEnterSpace(family)">
            进入空间
          </el-button>
          <el-button type="default" :icon="Setting" @click="handleManage(family)">
            管理
          </el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="showCreateDialog" title="创建家庭" width="450px" @close="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="家庭名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入家庭名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="简单描述一下这个家庭"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showJoinDialog" title="加入家庭" width="450px" @close="resetJoinForm">
      <el-form ref="joinFormRef" :model="joinForm" :rules="joinRules" label-width="100px">
        <el-form-item label="邀请码" prop="code">
          <el-input
            v-model="joinForm.code"
            placeholder="请输入6位邀请码"
            maxlength="6"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" :loading="joinLoading" @click="handleJoin">
          加入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { HomeFilled, Plus, User, Calendar, Setting, Right, Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { createFamily } from '@/api/families'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const families = ref([])

const showCreateDialog = ref(false)
const createLoading = ref(false)
const createFormRef = ref()
const createForm = reactive({
  name: '',
  description: ''
})
const createRules = {
  name: [{ required: true, message: '请输入家庭名称', trigger: 'blur' }]
}

const showJoinDialog = ref(false)
const joinLoading = ref(false)
const joinFormRef = ref()
const joinForm = reactive({
  code: ''
})
const joinRules = {
  code: [
    { required: true, message: '请输入邀请码', trigger: 'blur' },
    { len: 6, message: '邀请码为6位', trigger: 'blur' }
  ]
}

function getRoleText(role) {
  const roleMap = {
    owner: '所有者',
    admin: '管理员',
    member: '成员'
  }
  return roleMap[role] || '成员'
}

function getRoleTagType(role) {
  const typeMap = {
    owner: 'danger',
    admin: 'warning',
    member: 'info'
  }
  return typeMap[role] || 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function handleEnterSpace(family) {
  userStore.setFamilySpace(family.id)
  ElMessage.success(`已切换到「${family.name}」空间`)
  router.go(0)
}

function handleManage(family) {
  router.push(`/families/${family.id}`)
}

function resetCreateForm() {
  createFormRef.value?.resetFields()
  createForm.name = ''
  createForm.description = ''
}

async function handleCreate() {
  if (!createFormRef.value) return
  try {
    await createFormRef.value.validate()
    createLoading.value = true
    await createFamily(createForm)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    await userStore.fetchFamilies()
    families.value = userStore.families
  } catch (error) {
    console.error(error)
  } finally {
    createLoading.value = false
  }
}

function resetJoinForm() {
  joinFormRef.value?.resetFields()
  joinForm.code = ''
}

async function handleJoin() {
  if (!joinFormRef.value) return
  try {
    await joinFormRef.value.validate()
    joinLoading.value = true
    await userStore.joinFamily(joinForm.code.toUpperCase())
    ElMessage.success('加入成功')
    showJoinDialog.value = false
    families.value = userStore.families
  } catch (error) {
    console.error(error)
  } finally {
    joinLoading.value = false
  }
}

async function loadFamilies() {
  loading.value = true
  try {
    await userStore.fetchFamilies()
    families.value = userStore.families
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFamilies()
})
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: var(--color-text-light);
  gap: 12px;
}

.empty-state {
  padding: 40px 20px;
}

.empty-desc {
  color: var(--color-text-light);
  margin-top: 8px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.family-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.family-card {
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.family-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 115, 85, 0.15) !important;
}

.family-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-gray);
}

.family-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-light-green) 0%, var(--color-light-green-dark) 100%);
  color: var(--color-brown-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}

.family-header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.family-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
}

.family-description {
  color: var(--color-text-light);
  font-size: 14px;
  margin-bottom: 16px;
  min-height: 40px;
  line-height: 1.5;
}

.family-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-light);
}

.meta-item .el-icon {
  color: var(--color-light-brown);
}

.family-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.family-actions .el-button {
  flex: 1;
}

:deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
