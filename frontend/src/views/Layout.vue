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
          <div class="global-search">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索物品、收纳盒、分类..."
              class="search-input"
              clearable
              @input="handleSearchInput"
              @keyup.enter="handleSearchEnter"
              @clear="handleSearchClear"
              @focus="handleSearchFocus"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <div
              v-if="showDropdown && (itemResults.length > 0 || boxResults.length > 0)"
              class="search-dropdown"
              @click.stop
            >
              <div v-if="itemResults.length > 0" class="search-group">
                <div class="search-group-title">
                  <el-icon><Goods /></el-icon>
                  <span>物品</span>
                </div>
                <div
                  v-for="item in itemResults"
                  :key="'item-' + item.id"
                  class="search-item"
                  @click="goToItem(item)"
                >
                  <div class="search-item-main">
                    <span class="search-item-name" v-html="highlightText(item.name, searchKeyword)"></span>
                    <el-tag v-if="item.category" size="small" type="info">{{ item.category }}</el-tag>
                  </div>
                  <div class="search-item-sub">
                    <span v-if="item.box_name" class="sub-info">
                      <el-icon><Box /></el-icon>
                      {{ item.box_name }}
                    </span>
                    <span v-if="item.description" class="sub-desc" v-html="highlightText(item.description, searchKeyword)"></span>
                  </div>
                </div>
              </div>
              <div v-if="boxResults.length > 0" class="search-group">
                <div class="search-group-title">
                  <el-icon><Box /></el-icon>
                  <span>收纳盒</span>
                </div>
                <div
                  v-for="box in boxResults"
                  :key="'box-' + box.id"
                  class="search-item"
                  @click="goToBox(box)"
                >
                  <div class="search-item-main">
                    <span class="search-item-name" v-html="highlightText(box.name, searchKeyword)"></span>
                    <span class="item-count">{{ box.item_count }} 件物品</span>
                  </div>
                  <div class="search-item-sub">
                    <span v-if="box.location" class="sub-info">
                      <el-icon><Location /></el-icon>
                      {{ box.location }}
                    </span>
                    <span v-if="box.description" class="sub-desc" v-html="highlightText(box.description, searchKeyword)"></span>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="showDropdown && searchKeyword && itemResults.length === 0 && boxResults.length === 0 && !searchLoading"
              class="search-dropdown search-no-result"
            >
              <el-icon><Search /></el-icon>
              <span>未找到相关结果</span>
            </div>
            <div v-if="searchLoading" class="search-dropdown search-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>搜索中...</span>
            </div>
          </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, CaretBottom, User, SwitchButton, Tickets, Goods, Box, Location, Loading } from '@element-plus/icons-vue'
import { searchItems } from '@/api/items'
import { searchBoxes } from '@/api/boxes'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showDropdown = ref(false)
const searchLoading = ref(false)
const itemResults = ref([])
const boxResults = ref([])
let searchTimer = null

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

function handleSearchInput() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  if (!searchKeyword.value || searchKeyword.value.trim() === '') {
    itemResults.value = []
    boxResults.value = []
    return
  }
  searchTimer = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    showDropdown.value = false
    return
  }

  searchLoading.value = true
  try {
    const [itemsRes, boxesRes] = await Promise.all([
      searchItems(keyword),
      searchBoxes(keyword)
    ])
    itemResults.value = (itemsRes.list || []).slice(0, 5)
    boxResults.value = (boxesRes.list || []).slice(0, 5)
    showDropdown.value = true
  } catch (e) {
    console.error('搜索失败', e)
    itemResults.value = []
    boxResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function handleSearchEnter() {
  if (searchKeyword.value.trim()) {
    performSearch()
  }
}

function handleSearchClear() {
  itemResults.value = []
  boxResults.value = []
  showDropdown.value = false
}

function handleSearchFocus() {
  if (searchKeyword.value.trim() && (itemResults.value.length > 0 || boxResults.value.length > 0)) {
    showDropdown.value = true
  }
}

function handleClickOutside(e) {
  const searchContainer = document.querySelector('.global-search')
  if (searchContainer && !searchContainer.contains(e.target)) {
    showDropdown.value = false
  }
}

function highlightText(text, keyword) {
  if (!text || !keyword) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

function goToItem(item) {
  showDropdown.value = false
  router.push({ path: '/items', query: { keyword: searchKeyword.value, highlightId: item.id } })
}

function goToBox(box) {
  showDropdown.value = false
  router.push({ path: `/boxes/${box.id}` })
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
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
  max-width: 500px;
}

.global-search {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-gray);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  max-height: 400px;
  overflow-y: auto;
}

.search-dropdown.search-no-result,
.search-dropdown.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--color-text-light);
  font-size: 14px;
}

.search-group {
  padding: 8px 0;
}

.search-group + .search-group {
  border-top: 1px solid var(--color-gray);
}

.search-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.search-item:hover {
  background-color: var(--color-cream);
}

.search-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.search-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
}

.item-count {
  font-size: 12px;
  color: var(--color-text-light);
}

.search-item-sub {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-light);
  flex-wrap: wrap;
}

.sub-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sub-desc {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.highlight) {
  color: var(--color-primary);
  font-weight: 600;
  background-color: rgba(var(--color-primary-rgb), 0.1);
  padding: 0 2px;
  border-radius: 2px;
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
