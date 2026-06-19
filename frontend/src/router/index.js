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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (!to.meta.requiresAuth && token) {
    next('/')
  } else {
    next()
  }
})

export default router
