<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <span class="logo-icon">📦</span>
        <span class="logo-text">清新收纳</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-input
            v-model="searchKeyword"
            placeholder="快速搜索物品..."
            class="search-input"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" style="background-color: var(--color-light-green); color: var(--color-brown-dark);">
                {{ username.charAt(0) }}
              </el-avatar>
              <span class="username">{{ username }}</span>
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="templates">
                  <el-icon><Tickets /></el-icon>
                  标签模板
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, CaretBottom, User, SwitchButton, Tickets } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')

const username = computed(() => userStore.username)

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/boxes')) return '/boxes'
  if (path.startsWith('/items')) return '/items'
  if (path.startsWith('/labels')) return '/labels'
  if (path.startsWith('/records')) return '/records'
  if (path.startsWith('/expiring')) return '/expiring'
  if (path.startsWith('/shopping')) return '/shopping'
  return path
})

const menuItems = [
  { path: '/dashboard', title: '首页概览', icon: 'HomeFilled' },
  { path: '/boxes', title: '收纳盒管理', icon: 'Box' },
  { path: '/items', title: '物品管理', icon: 'Goods' },
  { path: '/labels', title: '标签打印', icon: 'Postcard' },
  { path: '/records', title: '存取记录', icon: 'Document' },
  { path: '/expiring', title: '过期提醒', icon: 'Warning' },
  { path: '/shopping', title: '购物清单', icon: 'ShoppingCart' }
]

function handleSearch() {
  if (searchKeyword.value) {
    router.push({ path: '/items', query: { keyword: searchKeyword.value } })
  }
}

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    }).catch(() => {})
  } else if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'templates') {
    router.push('/templates')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: var(--color-white);
  border-right: 1px solid var(--color-gray);
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-gray);
  background-color: var(--color-cream);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-brown-dark);
}

.menu {
  flex: 1;
  padding: 10px 0;
}

.header {
  background-color: var(--color-white);
  border-bottom: 1px solid var(--color-gray);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
}

.header-left {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--color-text);
}

.username {
  font-size: 14px;
}

.main-content {
  padding: 0;
  background-color: var(--color-cream);
  overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
