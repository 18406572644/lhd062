<template>
  <div class="page-container">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
          <h2 class="page-title">
            <el-icon><HomeFilled /></el-icon>
            {{ family?.name || '家庭详情' }}
          </h2>
        </div>
        <div class="header-right">
          <el-button v-if="userStore.hasPermission('invite_members')" type="primary" :icon="Plus" @click="openInviteDialog">
            生成邀请码
          </el-button>
          <el-button v-if="userStore.hasPermission('manage_boxes')" type="warning" :icon="Setting" @click="activeTab = 'share'">
            共享设置
          </el-button>
        </div>
      </div>

      <el-card v-if="family" class="family-info-card">
        <div class="family-info">
          <div class="family-main">
            <div class="family-avatar" :style="{ backgroundColor: family.color || 'var(--color-light-green)' }">
              {{ family.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="family-details">
              <h3>{{ family.name }}</h3>
              <p class="family-desc">{{ family.description || '暂无描述' }}</p>
              <div class="family-stats">
                <el-tag type="info">成员：{{ family.members?.length || 0 }} 人</el-tag>
                <el-tag type="success">收纳盒：{{ family.box_count || 0 }} 个</el-tag>
                <el-tag type="warning">创建于：{{ formatDate(family.created_at) }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <el-card v-if="family" class="tabs-card">
        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane label="成员管理" name="members">
            <template v-if="userStore.hasPermission('manage_members')">
              <el-table :data="family.members || []" style="width: 100%">
                <el-table-column label="成员" min-width="200">
                  <template #default="{ row }">
                    <div class="member-item">
                      <div class="member-avatar" :style="{ backgroundColor: getUserColor(row.id) }">
                        {{ row.nickname?.charAt(0)?.toUpperCase() || row.username?.charAt(0)?.toUpperCase() }}
                      </div>
                      <div class="member-info">
                        <div class="member-name">{{ row.nickname || row.username }}</div>
                        <div class="member-username">@{{ row.username }}</div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="角色" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getRoleType(row.role)">
                      {{ getRoleLabel(row.role) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="加入时间" width="180">
                  <template #default="{ row }">
                    {{ formatDate(row.joined_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="280" fixed="right">
                  <template #default="{ row }">
                    <template v-if="currentUserRole === 'owner' && row.id !== currentUserId">
                      <el-select
                        v-model="row.tempRole"
                        size="small"
                        style="width: 100px; margin-right: 8px;"
                        @change="handleRoleChange(row)"
                      >
                        <el-option label="管理员" value="admin" />
                        <el-option label="成员" value="member" />
                      </el-select>
                      <el-button size="small" type="warning" link @click="handleTransfer(row)">
                        转让
                      </el-button>
                      <el-button size="small" type="danger" link @click="handleRemoveMember(row)">
                        移除
                      </el-button>
                    </template>
                    <template v-else-if="currentUserRole === 'admin' && row.role === 'member'">
                      <el-button size="small" type="danger" link @click="handleRemoveMember(row)">
                        移除
                      </el-button>
                    </template>
                    <template v-else-if="row.id === currentUserId && currentUserRole !== 'owner'">
                      <el-button size="small" type="danger" link @click="handleLeave">
                        退出家庭
                      </el-button>
                    </template>
                    <template v-else-if="row.id === currentUserId && currentUserRole === 'owner'">
                      <el-tag type="danger" size="small">当前用户</el-tag>
                    </template>
                    <template v-else>
                      <span class="text-light">-</span>
                    </template>
                  </template>
                </el-table-column>
              </el-table>
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">🔒</div>
              <p>您没有权限查看成员管理</p>
            </div>
          </el-tab-pane>

          <el-tab-pane label="邀请管理" name="invitations">
            <template v-if="userStore.hasPermission('invite_members')">
              <div class="invite-header">
                <el-button type="primary" :icon="Plus" @click="openInviteDialog">
                  生成邀请码
                </el-button>
              </div>
              <el-table :data="family.invitations || []" style="width: 100%">
                <el-table-column label="邀请码" width="200">
                  <template #default="{ row }">
                    <span class="invite-code">{{ row.code }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="邀请人" width="150">
                  <template #default="{ row }">
                    {{ row.inviter?.nickname || row.inviter?.username }}
                  </template>
                </el-table-column>
                <el-table-column label="使用次数" width="120">
                  <template #default="{ row }">
                    {{ row.used_count }} / {{ row.max_uses === 0 ? '∞' : row.max_uses }}
                  </template>
                </el-table-column>
                <el-table-column label="过期时间" width="180">
                  <template #default="{ row }">
                    {{ row.expires_at ? formatDate(row.expires_at) : '永久有效' }}
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getInvitationStatusType(row)" size="small">
                      {{ getInvitationStatusLabel(row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" link @click="copyCode(row.code)">
                      复制
                    </el-button>
                    <el-button size="small" type="danger" link @click="handleRevoke(row)">
                      撤销
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="!family.invitations?.length" class="empty-state">
                <div class="empty-icon">📧</div>
                <p>暂无邀请码，点击上方按钮生成</p>
              </div>
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">🔒</div>
              <p>您没有权限管理邀请</p>
            </div>
          </el-tab-pane>

          <el-tab-pane label="共享设置" name="share">
            <template v-if="userStore.hasPermission('manage_boxes')">
              <div class="share-section">
                <h4>数据共享</h4>
                <div class="share-toggle">
                  <span>共享全部数据</span>
                  <el-switch
                    v-model="shareSettings.share_all"
                    @change="handleShareAllChange"
                  />
                </div>
                <p class="share-desc">开启后，家庭所有成员将可以查看所有收纳盒数据</p>
              </div>

              <div v-if="!shareSettings.share_all" class="share-section">
                <h4>选择共享收纳盒</h4>
                <el-select
                  v-model="shareSettings.shared_box_ids"
                  multiple
                  placeholder="请选择要共享的收纳盒"
                  style="width: 100%;"
                  @change="handleSharedBoxesChange"
                >
                  <el-option
                    v-for="box in allBoxes"
                    :key="box.id"
                    :label="box.name"
                    :value="box.id"
                  />
                </el-select>
                <p class="share-desc">选择的收纳盒将对所有家庭成员可见</p>
              </div>

              <el-divider />

              <div class="convert-section">
                <h4>收纳盒空间转换</h4>
                <div class="convert-columns">
                  <div class="convert-column">
                    <div class="convert-header">
                      <span>私人收纳盒</span>
                      <el-button
                        size="small"
                        type="primary"
                        :disabled="selectedPrivateBoxes.length === 0"
                        @click="handleConvertToFamily"
                      >
                        移至家庭空间 →
                      </el-button>
                    </div>
                    <el-table
                      :data="privateBoxes"
                      style="width: 100%"
                      @selection-change="val => selectedPrivateBoxes = val"
                    >
                      <el-table-column type="selection" width="50" />
                      <el-table-column label="名称" prop="name" />
                      <el-table-column label="物品数" width="100" prop="item_count" />
                    </el-table>
                    <div v-if="privateBoxes.length === 0" class="empty-state-small">
                      暂无私人收纳盒
                    </div>
                  </div>

                  <div class="convert-column">
                    <div class="convert-header">
                      <el-button
                        size="small"
                        type="warning"
                        :disabled="selectedFamilyBoxes.length === 0"
                        @click="handleConvertToPrivate"
                      >
                        ← 移至私人空间
                      </el-button>
                      <span>家庭收纳盒</span>
                    </div>
                    <el-table
                      :data="familyBoxes"
                      style="width: 100%"
                      @selection-change="val => selectedFamilyBoxes = val"
                    >
                      <el-table-column type="selection" width="50" />
                      <el-table-column label="名称" prop="name" />
                      <el-table-column label="物品数" width="100" prop="item_count" />
                    </el-table>
                    <div v-if="familyBoxes.length === 0" class="empty-state-small">
                      暂无家庭收纳盒
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">🔒</div>
              <p>您没有权限管理共享设置</p>
            </div>
          </el-tab-pane>

          <el-tab-pane label="高级设置" name="advanced">
            <template v-if="userStore.hasPermission('manage_members')">
              <el-form :model="familyForm" :rules="familyRules" label-width="100px" style="max-width: 500px;">
                <el-form-item label="家庭名称" prop="name">
                  <el-input v-model="familyForm.name" placeholder="请输入家庭名称" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input
                    v-model="familyForm.description"
                    type="textarea"
                    :rows="3"
                    placeholder="简单描述这个家庭"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="updateLoading" @click="handleUpdateFamily">
                    保存更改
                  </el-button>
                </el-form-item>
              </el-form>

              <el-divider />

              <div class="danger-zone">
                <h4>危险操作</h4>
                <div class="danger-actions">
                  <el-button
                    v-if="userStore.hasPermission('transfer_family')"
                    type="warning"
                    :icon="UserFilled"
                    @click="openTransferDialog"
                  >
                    转让家庭
                  </el-button>
                  <el-button
                    v-if="userStore.hasPermission('delete_family')"
                    type="danger"
                    :icon="Delete"
                    @click="handleDeleteFamily"
                  >
                    删除家庭
                  </el-button>
                </div>
                <p class="danger-tip">这些操作不可逆，请谨慎操作</p>
              </div>
            </template>
            <div v-else class="empty-state">
              <div class="empty-icon">🔒</div>
              <p>您没有权限查看高级设置</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <el-dialog
      v-model="inviteDialogVisible"
      title="生成邀请码"
      width="400px"
    >
      <el-form :model="inviteForm" :rules="inviteRules" label-width="100px">
        <el-form-item label="最大使用次数">
          <el-input-number v-model="inviteForm.max_uses" :min="0" />
          <span class="form-tip">0 表示不限制</span>
        </el-form-item>
        <el-form-item label="有效期（天）">
          <el-input-number v-model="inviteForm.expires_in_days" :min="0" />
          <span class="form-tip">0 表示永久有效</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="inviteLoading" @click="handleCreateInvitation">
          生成
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="transferDialogVisible"
      title="转让家庭"
      width="400px"
    >
      <el-form :model="transferForm" :rules="transferRules" label-width="100px">
        <el-form-item label="新所有者" prop="new_owner_id">
          <el-select v-model="transferForm.new_owner_id" placeholder="选择新的家庭所有者">
            <el-option
              v-for="member in transferableMembers"
              :key="member.id"
              :label="member.nickname || member.username"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <p class="danger-tip">转让后您将失去所有者权限，请谨慎操作</p>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="transferLoading" @click="handleConfirmTransfer">
          确认转让
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Plus, Setting, HomeFilled, Loading, UserFilled, Delete
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getFamilyDetail,
  updateFamily,
  deleteFamily,
  createInvitation,
  updateMemberRole,
  transferFamily,
  removeMember,
  leaveFamily,
  revokeInvitation,
  updateSharedBoxes,
  convertBoxesSpace
} from '@/api/families'
import { getAllBoxes } from '@/api/boxes'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const updateLoading = ref(false)
const inviteLoading = ref(false)
const transferLoading = ref(false)
const family = ref(null)
const activeTab = ref('members')
const allBoxes = ref([])

const inviteDialogVisible = ref(false)
const transferDialogVisible = ref(false)

const selectedPrivateBoxes = ref([])
const selectedFamilyBoxes = ref([])

const shareSettings = reactive({
  share_all: false,
  shared_box_ids: []
})

const familyForm = reactive({
  name: '',
  description: ''
})

const familyRules = {
  name: [{ required: true, message: '请输入家庭名称', trigger: 'blur' }]
}

const inviteForm = reactive({
  max_uses: 0,
  expires_in_days: 0
})

const inviteRules = {}

const transferForm = reactive({
  new_owner_id: null
})

const transferRules = {
  new_owner_id: [{ required: true, message: '请选择新所有者', trigger: 'change' }]
}

const familyId = computed(() => route.params.id)

const currentUserId = computed(() => userStore.user?.id)

const currentUserRole = computed(() => {
  if (!family.value?.members) return null
  const currentMember = family.value.members.find(m => m.id === currentUserId.value)
  return currentMember?.role || null
})

const transferableMembers = computed(() => {
  if (!family.value?.members) return []
  return family.value.members.filter(m => m.id !== currentUserId.value)
})

const privateBoxes = computed(() => {
  return allBoxes.value.filter(b => b.space === 'private')
})

const familyBoxes = computed(() => {
  return allBoxes.value.filter(b => b.space === 'family')
})

function getRoleType(role) {
  const types = {
    owner: 'danger',
    admin: 'warning',
    member: 'info'
  }
  return types[role] || 'info'
}

function getRoleLabel(role) {
  const labels = {
    owner: '所有者',
    admin: '管理员',
    member: '成员'
  }
  return labels[role] || role
}

function getUserColor(userId) {
  const colors = [
    '#B8D8BA', '#D4B896', '#8FC493', '#B8956E',
    '#F2CC8F', '#81B29A', '#E07A5F', '#8B7355'
  ]
  const index = userId % colors.length
  return colors[index]
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function isInvitationExpired(invitation) {
  if (invitation.max_uses > 0 && invitation.used_count >= invitation.max_uses) {
    return true
  }
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return true
  }
  return false
}

function getInvitationStatusType(invitation) {
  return isInvitationExpired(invitation) ? 'info' : 'success'
}

function getInvitationStatusLabel(invitation) {
  return isInvitationExpired(invitation) ? '已失效' : '有效'
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function goBack() {
  router.back()
}

function openInviteDialog() {
  inviteForm.max_uses = 0
  inviteForm.expires_in_days = 0
  inviteDialogVisible.value = true
}

function openTransferDialog() {
  transferForm.new_owner_id = null
  transferDialogVisible.value = true
}

async function loadFamilyDetail() {
  loading.value = true
  try {
    const res = await getFamilyDetail(familyId.value)
    family.value = res
    familyForm.name = res.name
    familyForm.description = res.description || ''
    shareSettings.share_all = res.share_all || false
    shareSettings.shared_box_ids = res.shared_box_ids || []

    family.value.members = family.value.members?.map(m => ({
      ...m,
      tempRole: m.role
    })) || []
  } catch (error) {
    console.error(error)
    ElMessage.error('加载家庭详情失败')
  } finally {
    loading.value = false
  }
}

async function loadAllBoxes() {
  try {
    const res = await getAllBoxes()
    allBoxes.value = res.boxes || []
  } catch (error) {
    console.error(error)
  }
}

async function handleUpdateFamily() {
  try {
    updateLoading.value = true
    await updateFamily(familyId.value, {
      name: familyForm.name,
      description: familyForm.description
    })
    ElMessage.success('更新成功')
    loadFamilyDetail()
  } catch (error) {
    console.error(error)
  } finally {
    updateLoading.value = false
  }
}

async function handleCreateInvitation() {
  try {
    inviteLoading.value = true
    const data = {
      max_uses: inviteForm.max_uses
    }
    if (inviteForm.expires_in_days > 0) {
      data.expires_in_days = inviteForm.expires_in_days
    }
    await createInvitation(familyId.value, data)
    ElMessage.success('邀请码生成成功')
    inviteDialogVisible.value = false
    loadFamilyDetail()
  } catch (error) {
    console.error(error)
  } finally {
    inviteLoading.value = false
  }
}

async function handleRoleChange(member) {
  try {
    await updateMemberRole(familyId.value, member.id, member.tempRole)
    ElMessage.success('角色更新成功')
    member.role = member.tempRole
  } catch (error) {
    console.error(error)
    member.tempRole = member.role
  }
}

async function handleRemoveMember(member) {
  ElMessageBox.confirm(
    `确定要移除成员"${member.nickname || member.username}"吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await removeMember(familyId.value, member.id)
      ElMessage.success('移除成功')
      loadFamilyDetail()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleLeave() {
  ElMessageBox.confirm(
    '确定要退出这个家庭吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await leaveFamily(familyId.value, currentUserId.value)
      ElMessage.success('已退出家庭')
      userStore.setPrivateSpace()
      router.push('/')
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleTransfer(member) {
  ElMessageBox.confirm(
    `确定要将家庭转让给"${member.nickname || member.username}"吗？转让后您将失去所有者权限。`,
    '转让家庭',
    {
      confirmButtonText: '确定转让',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      await transferFamily(familyId.value, member.id)
      ElMessage.success('转让成功')
      await userStore.fetchFamilies()
      loadFamilyDetail()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleConfirmTransfer() {
  if (!transferForm.new_owner_id) return
  
  const member = family.value.members.find(m => m.id === transferForm.new_owner_id)
  if (!member) return

  try {
    transferLoading.value = true
    await transferFamily(familyId.value, member.id)
    ElMessage.success('转让成功')
    transferDialogVisible.value = false
    await userStore.fetchFamilies()
    loadFamilyDetail()
  } catch (error) {
    console.error(error)
  } finally {
    transferLoading.value = false
  }
}

async function handleRevoke(invitation) {
  ElMessageBox.confirm(
    '确定要撤销这个邀请码吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await revokeInvitation(familyId.value, invitation.id)
      ElMessage.success('撤销成功')
      loadFamilyDetail()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleShareAllChange(val) {
  try {
    if (val) {
      await updateSharedBoxes(familyId.value, [])
      ElMessage.success('已开启全部共享')
    }
    loadFamilyDetail()
  } catch (error) {
    console.error(error)
    shareSettings.share_all = !val
  }
}

async function handleSharedBoxesChange() {
  try {
    await updateSharedBoxes(familyId.value, shareSettings.shared_box_ids)
    ElMessage.success('共享设置已更新')
  } catch (error) {
    console.error(error)
  }
}

async function handleConvertToFamily() {
  if (selectedPrivateBoxes.value.length === 0) return

  const boxIds = selectedPrivateBoxes.value.map(b => b.id)
  const boxNames = selectedPrivateBoxes.value.map(b => b.name).join('、')

  ElMessageBox.confirm(
    `确定要将"${boxNames}"移至家庭空间吗？`,
    '空间转换',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await convertBoxesSpace(familyId.value, boxIds, true)
      ElMessage.success('转换成功')
      loadAllBoxes()
      selectedPrivateBoxes.value = []
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleConvertToPrivate() {
  if (selectedFamilyBoxes.value.length === 0) return

  const boxIds = selectedFamilyBoxes.value.map(b => b.id)
  const boxNames = selectedFamilyBoxes.value.map(b => b.name).join('、')

  ElMessageBox.confirm(
    `确定要将"${boxNames}"移至私人空间吗？`,
    '空间转换',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await convertBoxesSpace(familyId.value, boxIds, false)
      ElMessage.success('转换成功')
      loadAllBoxes()
      selectedFamilyBoxes.value = []
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

async function handleDeleteFamily() {
  ElMessageBox.confirm(
    '确定要删除这个家庭吗？此操作不可恢复，所有家庭数据将被清除！',
    '删除家庭',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      await deleteFamily(familyId.value)
      ElMessage.success('删除成功')
      userStore.setPrivateSpace()
      await userStore.fetchFamilies()
      router.push('/')
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadFamilyDetail()
  loadAllBoxes()
})
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.family-info-card {
  margin-bottom: 20px;
}

.family-info {
  display: flex;
  align-items: center;
}

.family-main {
  display: flex;
  align-items: center;
  gap: 20px;
}

.family-avatar {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.family-details h3 {
  font-size: 22px;
  color: var(--color-brown-dark);
  margin-bottom: 8px;
}

.family-desc {
  color: var(--color-text-light);
  margin-bottom: 12px;
}

.family-stats {
  display: flex;
  gap: 12px;
}

.tabs-card {
  margin-bottom: 20px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.member-info .member-name {
  font-weight: 500;
  color: var(--color-text);
}

.member-info .member-username {
  font-size: 12px;
  color: var(--color-text-light);
}

.invite-header {
  margin-bottom: 16px;
}

.invite-code {
  font-family: 'Courier New', monospace;
  background-color: var(--color-cream-dark);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.share-section {
  margin-bottom: 24px;
}

.share-section h4 {
  font-size: 16px;
  color: var(--color-brown-dark);
  margin-bottom: 16px;
}

.share-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--color-cream-dark);
  border-radius: 8px;
  margin-bottom: 8px;
}

.share-desc {
  font-size: 12px;
  color: var(--color-text-light);
  margin-left: 8px;
}

.convert-section h4 {
  font-size: 16px;
  color: var(--color-brown-dark);
  margin-bottom: 16px;
}

.convert-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.convert-column {
  border: 1px solid var(--color-gray);
  border-radius: 8px;
  padding: 16px;
}

.convert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: var(--color-brown-dark);
}

.empty-state-small {
  text-align: center;
  padding: 30px;
  color: var(--color-text-light);
  font-size: 13px;
}

.danger-zone {
  margin-top: 20px;
}

.danger-zone h4 {
  font-size: 16px;
  color: var(--color-danger);
  margin-bottom: 16px;
}

.danger-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.danger-tip {
  font-size: 12px;
  color: var(--color-text-light);
}

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-light);
}

.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-light);
}

.loading-state .el-icon {
  color: var(--color-light-green-dark);
  margin-bottom: 12px;
}

.loading-state p {
  margin-top: 12px;
}

.text-light {
  color: var(--color-text-light);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-light);
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
</style>
