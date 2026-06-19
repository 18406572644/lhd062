<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">
          <el-icon><User /></el-icon>
          个人中心
        </h2>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="avatar-section">
            <el-avatar :size="80" style="background-color: var(--color-light-green); color: var(--color-brown-dark); font-size: 32px;">
              {{ user?.nickname?.charAt(0) || user?.username?.charAt(0) }}
            </el-avatar>
            <h3 class="username">{{ user?.nickname || user?.username }}</h3>
            <p class="user-sub">@{{ user?.username }}</p>
          </div>
          <el-divider />
          <div class="info-list">
            <div class="info-item">
              <span class="label">注册时间</span>
              <span class="value">{{ formatDate(user?.created_at) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <span>修改资料</span>
          </template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 400px;">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span>修改密码</span>
          </template>
          <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px" style="max-width: 400px;">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="passwordSubmitLoading" @click="handlePasswordSubmit">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span>使用数据</span>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-value">{{ stats.box_count || 0 }}</div>
                <div class="mini-label">收纳盒</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-value">{{ stats.item_count || 0 }}</div>
                <div class="mini-label">物品</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-value">{{ stats.total_volume || 0 }}</div>
                <div class="mini-label">总容积(cm³)</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft, User } from '@element-plus/icons-vue'
import { updateProfile } from '@/api/auth'
import { getOverview } from '@/api/stats'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const passwordFormRef = ref()
const submitLoading = ref(false)
const passwordSubmitLoading = ref(false)
const stats = ref({})

const user = ref(userStore.user)

const form = reactive({
  nickname: user.value?.nickname || ''
})

const rules = {
  nickname: [{ max: 20, message: '昵称长度不能超过20个字符', trigger: 'blur' }]
}

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0]
}

function goBack() {
  router.back()
}

async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    await updateProfile(form)
    await userStore.fetchProfile()
    user.value = userStore.user
    
    ElMessage.success('修改成功')
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

async function handlePasswordSubmit() {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    passwordSubmitLoading.value = true
    
    // TODO: 后端添加修改密码接口
    ElMessage.info('密码修改功能开发中...')
  } catch (error) {
    console.error(error)
  } finally {
    passwordSubmitLoading.value = false
  }
}

async function loadStats() {
  try {
    const res = await getOverview()
    stats.value = res
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-card {
  text-align: center;
}

.avatar-section {
  padding: 20px 0;
}

.username {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 12px 0 4px;
}

.user-sub {
  color: var(--color-text-light);
  font-size: 14px;
  margin: 0;
}

.info-list {
  padding: 10px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-item .label {
  color: var(--color-text-light);
}

.info-item .value {
  color: var(--color-text);
  font-weight: 500;
}

.mini-stat {
  text-align: center;
  padding: 20px;
  background: var(--color-cream);
  border-radius: 8px;
}

.mini-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-brown-dark);
  margin-bottom: 4px;
}

.mini-label {
  font-size: 13px;
  color: var(--color-text-light);
}
</style>
