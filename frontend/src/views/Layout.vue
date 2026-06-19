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
          <el-dropdown @command="handleSpaceCommand" trigger="click">
            <span class="space-switcher">
              <el-icon :class="currentSpace.type === 'private' ? 'private-icon' : 'family-icon'">
                <component :is="currentSpace.type === 'private' ? 'UserFilled' : 'HomeFilled'" />
              </el-icon>
              <span class="space-name">{{ currentSpaceName }}</span>
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  command="private" 
                  :class="{ 'is-active': isPrivateSpace }"
                >
                  <el-icon><UserFilled /></el-icon>
                  <span>我的私人空间</span>
                  <el-icon v-if="isPrivateSpace" class="check-icon"><Check /></el-icon>
                </el-dropdown-item>
                <el-dropdown-item divided v-if="families.length > 0">
                  <span class="menu-group-title">我的家庭</span>
                </el-dropdown-item>
                <el-dropdown-item 
                  v-for="family in families" 
                  :key="'family-' + family.id"
                  :command="'family:' + family.id"
                  :class="{ 'is-active': currentFamilyId === family.id }"
                >
                  <el-icon><HomeFilled /></el-icon>
                  <span class="family-item-name">{{ family.name }}</span>
                  <el-tag v-if="family.role === 'owner'" type="danger" size="small" effect="plain">所有者</el-tag>
                  <el-tag v-else-if="family.role === 'admin'" type="warning" size="small" effect="plain">管理员</el-tag>
                  <el-icon v-if="currentFamilyId === family.id" class="check-icon"><Check /></el-icon>
                </el-dropdown-item>
                <el-dropdown-item divided command="manage">
                  <el-icon><Setting /></el-icon>
                  管理家庭空间
                </el-dropdown-item>
                <el-dropdown-item command="join">
                  <el-icon><Plus /></el-icon>
                  加入家庭
                </el-dropdown-item>
                <el-dropdown-item command="create">
                  <el-icon><CirclePlus /></el-icon>
                  创建新家庭
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

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

  <el-dialog
    v-model="createDialogVisible"
    title="创建新家庭"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="createForm" label-width="80px">
      <el-form-item label="家庭名称">
        <el-input
          v-model="createForm.name"
          placeholder="请输入家庭名称"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="createForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入家庭描述（选填）"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleCreateFamily">创建</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="joinDialogVisible"
    title="加入家庭"
    width="420px"
    :close-on-click-modal="false"
  >
    <el-form label-width="80px">
      <el-form-item label="邀请码">
        <el-input
          v-model="joinCode"
          placeholder="请输入8位邀请码"
          maxlength="8"
          show-word-limit
          style="text-transform: uppercase; letter-spacing: 2px;"
        />
      </el-form-item>
    </el-form>
    <p style="color: var(--color-text-light); font-size: 13px; margin-top: -8px; margin-bottom: 16px;">
      请向家庭管理员索取邀请码，邀请码区分大小写
    </p>
    <template #footer>
      <el-button @click="joinDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleJoinFamily">加入</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage, ElInput } from 'element-plus'
import { Search, CaretBottom, User, SwitchButton, Tickets, Goods, Box, Location, Loading, HomeFilled, UserFilled, Check, Setting, Plus, CirclePlus } from '@element-plus/icons-vue'
import { searchItems } from '@/api/items'
import { searchBoxes } from '@/api/boxes'
import { createFamily } from '@/api/families'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const showDropdown = ref(false)
const searchLoading = ref(false)
const itemResults = ref([])
const boxResults = ref([])
const createDialogVisible = ref(false)
const joinDialogVisible = ref(false)
const createForm = ref({ name: '', description: '' })
const joinCode = ref('')
let searchTimer = null

const username = computed(() => userStore.username)
const currentSpace = computed(() => userStore.currentSpace)
const currentSpaceName = computed(() => userStore.currentSpaceName)
const isPrivateSpace = computed(() => userStore.isPrivateSpace)
const isFamilySpace = computed(() => userStore.isFamilySpace)
const currentFamilyId = computed(() => userStore.currentFamilyId)
const families = computed(() => userStore.families)

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

async function handleSpaceCommand(command) {
  if (command === 'private') {
    userStore.setPrivateSpace()
    ElMessage.success('已切换到私人空间')
    router.go(0)
  } else if (command.startsWith('family:')) {
    const familyId = parseInt(command.split(':')[1])
    if (userStore.setFamilySpace(familyId)) {
      ElMessage.success(`已切换到「${userStore.currentSpaceName}」`)
      router.go(0)
    }
  } else if (command === 'manage') {
    if (families.value.length > 0) {
      const familyId = currentFamilyId.value || families.value[0].id
      router.push(`/families/${familyId}`)
    } else {
      router.push('/families')
    }
  } else if (command === 'create') {
    createDialogVisible.value = true
  } else if (command === 'join') {
    joinDialogVisible.value = true
  }
}

async function handleCreateFamily() {
  if (!createForm.value.name?.trim()) {
    ElMessage.warning('请输入家庭名称')
    return
  }
  
  try {
    const res = await createFamily(createForm.value)
    ElMessage.success(res.message)
    createDialogVisible.value = false
    createForm.value = { name: '', description: '' }
    await userStore.fetchFamilies()
    if (res.family) {
      userStore.setFamilySpace(res.family.id)
      ElMessage.success(`已切换到「${res.family.name}」`)
      router.go(0)
    }
  } catch (e) {
    console.error('创建家庭失败', e)
  }
}

async function handleJoinFamily() {
  if (!joinCode.value?.trim()) {
    ElMessage.warning('请输入邀请码')
    return
  }
  
  try {
    const res = await userStore.joinFamily(joinCode.value.trim().toUpperCase())
    ElMessage.success(res.message)
    joinDialogVisible.value = false
    joinCode.value = ''
    if (res.family) {
      userStore.setFamilySpace(res.family.id)
      ElMessage.success(`已切换到「${res.family.name}」`)
      router.go(0)
    }
  } catch (e) {
    console.error('加入家庭失败', e)
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

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  if (userStore.isLoggedIn) {
    await userStore.fetchFamilies()
  }
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

.space-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background-color: var(--color-cream);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text);
  max-width: 220px;
}

.space-switcher:hover {
  background-color: var(--color-light-green);
}

.space-switcher .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.private-icon {
  color: var(--color-primary);
}

.family-icon {
  color: var(--color-warning);
}

.space-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
}

:deep(.el-dropdown-menu__item.is-active) {
  background-color: var(--color-cream);
  color: var(--color-primary);
}

.menu-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.family-item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.check-icon {
  color: var(--color-primary);
  font-size: 16px;
  margin-left: auto;
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
