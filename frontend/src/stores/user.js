import { defineStore } from 'pinia'
import { login, register, getProfile } from '@/api/auth'
import { getFamilyList, joinFamilyByCode } from '@/api/families'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    families: [],
    currentSpace: JSON.parse(localStorage.getItem('currentSpace') || '{"type":"private","id":null,"name":"我的私人空间"}')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.user?.nickname || state.user?.username || '',
    currentSpaceName: (state) => state.currentSpace?.name || '我的私人空间',
    isPrivateSpace: (state) => state.currentSpace?.type === 'private',
    isFamilySpace: (state) => state.currentSpace?.type === 'family',
    currentFamilyId: (state) => state.currentSpace?.type === 'family' ? state.currentSpace?.id : null,
    currentFamilyRole: (state) => state.currentSpace?.role || null
  },

  actions: {
    async login(loginData) {
      const res = await login(loginData)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      await this.fetchFamilies()
      return res
    },

    async register(registerData) {
      const res = await register(registerData)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      this.setPrivateSpace()
      return res
    },

    async fetchProfile() {
      const res = await getProfile()
      this.user = res.user
      localStorage.setItem('user', JSON.stringify(res.user))
      return res
    },

    async fetchFamilies() {
      try {
        const res = await getFamilyList()
        this.families = res.families || []
        this.validateCurrentSpace()
        return this.families
      } catch (e) {
        console.error('获取家庭列表失败', e)
        this.families = []
        return []
      }
    },

    validateCurrentSpace() {
      if (this.currentSpace.type === 'family') {
        const exists = this.families.some(f => f.id === this.currentSpace.id)
        if (!exists) {
          this.setPrivateSpace()
        } else {
          const family = this.families.find(f => f.id === this.currentSpace.id)
          if (family) {
            this.currentSpace.role = family.role
            this.currentSpace.name = family.name
            localStorage.setItem('currentSpace', JSON.stringify(this.currentSpace))
          }
        }
      }
    },

    setPrivateSpace() {
      this.currentSpace = {
        type: 'private',
        id: null,
        name: '我的私人空间',
        role: null
      }
      localStorage.setItem('currentSpace', JSON.stringify(this.currentSpace))
    },

    setFamilySpace(familyId) {
      const family = this.families.find(f => f.id === familyId)
      if (family) {
        this.currentSpace = {
          type: 'family',
          id: family.id,
          name: family.name,
          role: family.role
        }
        localStorage.setItem('currentSpace', JSON.stringify(this.currentSpace))
        return true
      }
      return false
    },

    async joinFamily(code) {
      const res = await joinFamilyByCode({ code })
      await this.fetchFamilies()
      return res
    },

    logout() {
      this.token = ''
      this.user = null
      this.families = []
      this.setPrivateSpace()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    hasPermission(permission) {
      if (this.currentSpace.type === 'private') {
        return true
      }
      
      const role = this.currentSpace.role
      const permissions = {
        owner: ['manage_members', 'transfer_family', 'delete_family', 'manage_boxes', 'manage_items', 'invite_members', 'view', 'borrow_return'],
        admin: ['manage_boxes', 'manage_items', 'invite_members', 'view', 'borrow_return'],
        member: ['view', 'borrow_return']
      }
      
      return permissions[role]?.includes(permission) || false
    }
  }
})
