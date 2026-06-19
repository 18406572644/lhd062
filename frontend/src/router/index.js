import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页概览', icon: 'HomeFilled' }
      },
      {
        path: 'boxes',
        name: 'Boxes',
        component: () => import('@/views/Boxes.vue'),
        meta: { title: '收纳盒管理', icon: 'Box' }
      },
      {
        path: 'boxes/:id',
        name: 'BoxDetail',
        component: () => import('@/views/BoxDetail.vue'),
        meta: { title: '收纳盒详情', icon: 'Box', hidden: true }
      },
      {
        path: 'items',
        name: 'Items',
        component: () => import('@/views/Items.vue'),
        meta: { title: '物品管理', icon: 'Goods' }
      },
      {
        path: 'labels',
        name: 'Labels',
        component: () => import('@/views/Labels.vue'),
        meta: { title: '标签打印', icon: 'Postcard' }
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('@/views/Records.vue'),
        meta: { title: '存取记录', icon: 'Document' }
      },
      {
        path: 'expiring',
        name: 'Expiring',
        component: () => import('@/views/Expiring.vue'),
        meta: { title: '过期提醒', icon: 'Warning' }
      },
      {
        path: 'shopping',
        name: 'Shopping',
        component: () => import('@/views/Shopping.vue'),
        meta: { title: '购物清单', icon: 'ShoppingCart' }
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/Templates.vue'),
        meta: { title: '标签模板', icon: 'Tickets', hidden: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', icon: 'User', hidden: true }
      },
      {
        path: 'data-dashboard',
        name: 'DataDashboard',
        component: () => import('@/views/DataDashboard.vue'),
        meta: { title: '数据大屏', icon: 'DataLine', hidden: true }
      },
      {
        path: 'families',
        name: 'Families',
        component: () => import('@/views/Families.vue'),
        meta: { title: '家庭管理', icon: 'HomeFilled', hidden: true }
      },
      {
        path: 'families/:id',
        name: 'FamilyDetail',
        component: () => import('@/views/FamilyDetail.vue'),
        meta: { title: '家庭详情', icon: 'HomeFilled', hidden: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  let token = ''
  try {
    token = localStorage.getItem('token') || ''
  } catch (e) {
    console.warn('读取 token 失败', e)
    token = ''
  }
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
  const isAuthPage = to.path === '/login' || to.path === '/register'
  
  if (requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (isAuthPage && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
