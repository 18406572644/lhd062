<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">
          <span class="logo-icon">📦</span>
          <h1 class="title">注册账号</h1>
        </div>
        <p class="subtitle">开启你的整洁收纳之旅</p>
      </div>
      
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="auth-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="请输入昵称（选填）"
            size="large"
            :prefix-icon="Avatar"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请确认密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="auth-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="link">立即登录</router-link>
      </div>
    </div>
    
    <div class="decorations">
      <div class="deco-box deco-1">📦</div>
      <div class="deco-box deco-2">🏷️</div>
      <div class="deco-box deco-3">📋</div>
      <div class="deco-leaf leaf-1">🍃</div>
      <div class="deco-leaf leaf-2">🌿</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock, Avatar } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

async function handleRegister() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    await userStore.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname
    })
    
    ElMessage.success('注册成功')
    router.push('/')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-light-brown) 100%);
  position: relative;
  overflow: hidden;
}

.auth-card {
  width: 420px;
  background: var(--color-white);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(139, 115, 85, 0.15);
  position: relative;
  z-index: 10;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 40px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-brown-dark);
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-light);
  margin: 0;
}

.auth-form {
  margin-bottom: 24px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-light);
}

.link {
  color: var(--color-light-green-dark);
  font-weight: 500;
  margin-left: 4px;
}

.decorations {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.deco-box {
  position: absolute;
  font-size: 60px;
  opacity: 0.3;
  animation: float 6s ease-in-out infinite;
}

.deco-1 {
  top: 15%;
  left: 10%;
  animation-delay: 0s;
}

.deco-2 {
  top: 20%;
  right: 15%;
  font-size: 50px;
  animation-delay: 1s;
}

.deco-3 {
  bottom: 25%;
  left: 15%;
  font-size: 55px;
  animation-delay: 2s;
}

.deco-leaf {
  position: absolute;
  font-size: 40px;
  opacity: 0.4;
  animation: sway 8s ease-in-out infinite;
}

.leaf-1 {
  top: 30%;
  right: 10%;
  animation-delay: 0.5s;
}

.leaf-2 {
  bottom: 20%;
  right: 20%;
  font-size: 35px;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

@keyframes sway {
  0%, 100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}
</style>
