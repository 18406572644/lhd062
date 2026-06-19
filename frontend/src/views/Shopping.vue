<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><ShoppingCart /></el-icon>
        购物清单 & 补货助手
      </h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showListDialog = true">
          新建清单
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="list-card">
          <template #header>
            <span class="card-title">我的购物清单</span>
          </template>
          <div class="shopping-list-sidebar">
            <div
              v-for="list in shoppingLists"
              :key="list.id"
              class="list-item"
              :class="{ active: currentList?.id === list.id }"
              @click="selectList(list)"
            >
              <div class="list-item-header">
                <span class="list-name">{{ list.name }}</span>
                <el-tag v-if="list.is_active" size="small" type="success">进行中</el-tag>
                <el-tag v-else size="small" type="info">已完成</el-tag>
              </div>
              <div class="list-item-stats">
                <span>{{ list.purchased_count || 0 }}/{{ list.item_count || 0 }} 已购</span>
              </div>
            </div>
            <div v-if="shoppingLists.length === 0" class="empty-lists">
              <el-empty description="暂无购物清单" :image-size="80" />
            </div>
          </div>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span class="card-title">本月采购统计</span>
          </template>
          <div class="stats-summary">
            <div class="stat-item">
              <div class="stat-label">总花费</div>
              <div class="stat-value primary">¥{{ stats.total_spent?.toFixed(2) || '0.00' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">已购物品</div>
              <div class="stat-value">{{ stats.purchased_item_count || 0 }} 项</div>
            </div>
          </div>
          <div v-if="stats.by_category?.length > 0" class="category-stats">
            <div
              v-for="cat in stats.by_category"
              :key="cat.category"
              class="category-item"
            >
              <div class="category-name">{{ cat.category }}</div>
              <div class="category-bar">
                <div
                  class="category-bar-fill"
                  :style="{ width: (cat.total_spent / stats.total_spent * 100) + '%' }"
                ></div>
              </div>
              <div class="category-spent">¥{{ cat.total_spent.toFixed(2) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card v-if="currentList" class="detail-card">
          <template #header>
            <div class="detail-header">
              <div class="detail-title">
                <span>{{ currentList.name }}</span>
                <span v-if="currentList.description" class="detail-desc">
                  {{ currentList.description }}
                </span>
              </div>
              <div class="detail-actions">
                <el-button size="small" :icon="Download" @click="handleExport">
                  导出
                </el-button>
                <el-button size="small" :icon="Share" @click="handleShare">
                  分享
                </el-button>
                <el-button size="small" type="primary" :icon="Plus" @click="showItemDialog = true">
                  添加物品
                </el-button>
                <el-dropdown @command="handleListCommand">
                  <el-button size="small">
                    更多
                    <el-icon><CaretBottom /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑清单</el-dropdown-item>
                      <el-dropdown-item command="toggle">
                        {{ currentList.is_active ? '标记完成' : '重新激活' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided style="color: var(--color-danger);">
                        删除清单
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>

          <div class="quick-add-section" v-if="showQuickAdd">
            <el-alert
              title="快速补货"
              type="info"
              :closable="true"
              @close="showQuickAdd = false"
              style="margin-bottom: 16px;"
            >
              <template #default>
                <div class="quick-add-buttons">
                  <el-button size="small" type="primary" plain @click="addFromExpiring">
                    <el-icon><Warning /></el-icon>
                    从过期物品添加
                  </el-button>
                  <el-button size="small" type="success" plain @click="addFromLowStock">
                    <el-icon><Goods /></el-icon>
                    从库存不足添加
                  </el-button>
                </div>
              </template>
            </el-alert>
          </div>

          <div class="items-section">
            <div class="items-header">
              <span class="items-title">待购买</span>
              <span class="items-count">{{ unpurchasedItems.length }} 项</span>
            </div>
            <div v-if="unpurchasedItems.length === 0" class="empty-items">
              <el-empty description="暂无待购物品" :image-size="60" />
            </div>
            <div
              v-for="item in unpurchasedItems"
              :key="item.id"
              class="shopping-item"
            >
              <el-checkbox
                :model-value="false"
                @change="handlePurchase(item)"
              />
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-meta">
                  <el-tag v-if="item.category" size="small" type="info">
                    {{ item.category }}
                  </el-tag>
                  <span class="item-qty">× {{ item.quantity }} {{ item.unit }}</span>
                  <span v-if="item.price" class="item-price">预估 ¥{{ item.price }}</span>
                  <span v-if="item.remark" class="item-remark">{{ item.remark }}</span>
                </div>
              </div>
              <div class="item-actions">
                <el-button size="small" text @click="editItem(item)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" text type="danger" @click="deleteItem(item)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div class="items-section" v-if="purchasedItems.length > 0">
            <div class="items-header">
              <span class="items-title purchased-title">已购买</span>
              <span class="items-count">{{ purchasedItems.length }} 项</span>
              <span class="items-total">
                共 ¥{{ purchasedTotal.toFixed(2) }}
              </span>
            </div>
            <div
              v-for="item in purchasedItems"
              :key="item.id"
              class="shopping-item purchased"
            >
              <el-checkbox
                :model-value="true"
                @change="handleUnpurchase(item)"
              />
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-meta">
                  <el-tag v-if="item.category" size="small" type="info">
                    {{ item.category }}
                  </el-tag>
                  <span class="item-qty">× {{ item.quantity }} {{ item.unit }}</span>
                  <span v-if="item.price" class="item-price actual">
                    ¥{{ (item.price * item.quantity).toFixed(2) }}
                  </span>
                  <span v-if="item.purchased_at" class="item-purchased-date">
                    {{ formatDate(item.purchased_at) }}
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <el-button size="small" text @click="editItem(item)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" text type="danger" @click="deleteItem(item)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <el-card v-else class="empty-detail-card">
          <el-empty
            description="选择或创建一个购物清单开始采购"
            :image-size="120"
          >
            <template #description>
              <p>选择左侧清单开始管理</p>
              <p>或者点击上方按钮创建新清单</p>
            </template>
            <el-button type="primary" @click="showListDialog = true">
              <el-icon><Plus /></el-icon>
              新建购物清单
            </el-button>
          </el-empty>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="showListDialog"
      :title="editingList ? '编辑购物清单' : '新建购物清单'"
      width="450px"
      @close="resetListForm"
    >
      <el-form ref="listFormRef" :model="listForm" :rules="listRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="listForm.name" placeholder="请输入清单名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="listForm.description"
            type="textarea"
            :rows="3"
            placeholder="选填，描述一下这个清单的用途"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showListDialog = false">取消</el-button>
        <el-button type="primary" :loading="listSubmitLoading" @click="submitList">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showItemDialog"
      :title="editingItem ? '编辑物品' : '添加物品'"
      width="500px"
      @close="resetItemForm"
    >
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="80px">
        <el-form-item label="物品名称" prop="name">
          <el-input v-model="itemForm.name" placeholder="请输入物品名称" />
        </el-form-item>
        <el-form-item label="关联物品">
          <el-select
            v-model="itemForm.item_id"
            placeholder="选择已有物品（可选）"
            filterable
            clearable
            style="width: 100%"
            @change="onItemSelect"
          >
            <el-option
              v-for="item in searchResults"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="itemForm.category" placeholder="如：食品、日用品" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="itemForm.quantity" :min="1" />
          <span style="margin-left: 8px">
            <el-input v-model="itemForm.unit" placeholder="单位" style="width: 80px" />
          </span>
        </el-form-item>
        <el-form-item label="预估价格">
          <el-input-number v-model="itemForm.price" :min="0" :precision="2" :step="0.5" />
          <span style="margin-left: 8px">元（选填）</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="itemForm.remark"
            type="textarea"
            :rows="2"
            placeholder="选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showItemDialog = false">取消</el-button>
        <el-button type="primary" :loading="itemSubmitLoading" @click="submitItem">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showPurchaseDialog"
      title="确认购买"
      width="420px"
    >
      <div class="purchase-confirm">
        <p>确定要将 <strong>{{ purchasingItem?.name }}</strong> 标记为已购买吗？</p>
        <el-form label-width="100px" style="margin-top: 16px;">
          <el-form-item label="实际价格">
            <el-input-number v-model="purchaseForm.price" :min="0" :precision="2" :step="0.5" />
            <span style="margin-left: 8px">元</span>
          </el-form-item>
          <el-form-item label="回填库存">
            <el-switch v-model="purchaseForm.restock" />
            <span style="margin-left: 8px; color: var(--color-text-light); font-size: 12px;">
              购买后自动增加物品库存
            </span>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showPurchaseDialog = false">取消</el-button>
        <el-button type="primary" :loading="purchaseLoading" @click="confirmPurchase">
          确认购买
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showShareDialog" title="分享清单" width="400px">
      <div v-if="shareCode" class="share-content">
        <p>分享链接已生成，将链接发送给好友即可查看：</p>
        <div class="share-link">
          <el-input :value="shareLink" readonly>
            <template #append>
              <el-button @click="copyShareLink">复制</el-button>
            </template>
          </el-input>
        </div>
        <p style="margin-top: 12px; font-size: 12px; color: var(--color-text-light);">
          分享码：{{ shareCode }}
        </p>
      </div>
      <div v-else class="share-loading">
        <el-skeleton :rows="3" animated />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ShoppingCart, Plus, Edit, Delete, Download, Share, CaretBottom,
  Warning, Goods
} from '@element-plus/icons-vue'
import {
  getShoppingLists,
  getShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  purchaseShoppingItem,
  generateShareCode,
  exportShoppingList,
  getShoppingStats
} from '@/api/shopping'
import { searchItems, getItemList } from '@/api/items'

const shoppingLists = ref([])
const currentList = ref(null)
const stats = ref({})
const showQuickAdd = ref(true)

const showListDialog = ref(false)
const listFormRef = ref()
const listSubmitLoading = ref(false)
const editingList = ref(null)
const listForm = reactive({
  name: '',
  description: ''
})
const listRules = {
  name: [{ required: true, message: '请输入清单名称', trigger: 'blur' }]
}

const showItemDialog = ref(false)
const itemFormRef = ref()
const itemSubmitLoading = ref(false)
const editingItem = ref(null)
const searchResults = ref([])
const itemForm = reactive({
  id: null,
  item_id: null,
  name: '',
  category: '',
  quantity: 1,
  unit: '个',
  price: null,
  remark: ''
})
const itemRules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }]
}

const showPurchaseDialog = ref(false)
const purchasingItem = ref(null)
const purchaseLoading = ref(false)
const purchaseForm = reactive({
  price: null,
  restock: true
})

const showShareDialog = ref(false)
const shareCode = ref('')

const unpurchasedItems = computed(() => {
  return currentList.value?.items?.filter(item => !item.purchased) || []
})

const purchasedItems = computed(() => {
  return currentList.value?.items?.filter(item => item.purchased) || []
})

const purchasedTotal = computed(() => {
  return purchasedItems.value.reduce((sum, item) => {
    return sum + (item.price ? item.price * item.quantity : 0)
  }, 0)
})

const shareLink = computed(() => {
  if (!shareCode.value) return ''
  return `${window.location.origin}/#/share/${shareCode.value}`
})

async function loadLists() {
  try {
    const res = await getShoppingLists()
    shoppingLists.value = res.list
    if (res.list.length > 0 && !currentList.value) {
      selectList(res.list[0])
    }
  } catch (error) {
    console.error(error)
  }
}

async function selectList(list) {
  try {
    const res = await getShoppingList(list.id)
    currentList.value = res
  } catch (error) {
    console.error(error)
  }
}

async function loadStats() {
  try {
    const res = await getShoppingStats()
    stats.value = res
  } catch (error) {
    console.error(error)
  }
}

function resetListForm() {
  listFormRef.value?.resetFields()
  editingList.value = null
  listForm.name = ''
  listForm.description = ''
}

function handleListCommand(command) {
  if (command === 'edit') {
    editingList.value = currentList.value
    listForm.name = currentList.value.name
    listForm.description = currentList.value.description || ''
    showListDialog.value = true
  } else if (command === 'toggle') {
    toggleListStatus()
  } else if (command === 'delete') {
    handleDeleteList()
  }
}

async function submitList() {
  if (!listFormRef.value) return
  
  try {
    await listFormRef.value.validate()
    listSubmitLoading.value = true
    
    if (editingList.value) {
      await updateShoppingList(editingList.value.id, listForm)
      ElMessage.success('更新成功')
    } else {
      const res = await createShoppingList(listForm)
      ElMessage.success('创建成功')
      shoppingLists.value.unshift(res.list)
    }
    
    showListDialog.value = false
    loadLists()
    if (editingList.value) {
      selectList({ id: editingList.value.id })
    }
  } catch (error) {
    console.error(error)
  } finally {
    listSubmitLoading.value = false
  }
}

async function toggleListStatus() {
  try {
    const newStatus = !currentList.value.is_active
    await updateShoppingList(currentList.value.id, { is_active: newStatus })
    currentList.value.is_active = newStatus ? 1 : 0
    ElMessage.success(newStatus ? '已重新激活' : '已标记完成')
    loadLists()
  } catch (error) {
    console.error(error)
  }
}

function handleDeleteList() {
  ElMessageBox.confirm(`确定要删除清单"${currentList.value.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteShoppingList(currentList.value.id)
      ElMessage.success('删除成功')
      currentList.value = null
      loadLists()
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function resetItemForm() {
  itemFormRef.value?.resetFields()
  editingItem.value = null
  searchResults.value = []
  itemForm.id = null
  itemForm.item_id = null
  itemForm.name = ''
  itemForm.category = ''
  itemForm.quantity = 1
  itemForm.unit = '个'
  itemForm.price = null
  itemForm.remark = ''
}

function editItem(item) {
  editingItem.value = item
  itemForm.id = item.id
  itemForm.item_id = item.item_id
  itemForm.name = item.name
  itemForm.category = item.category
  itemForm.quantity = item.quantity
  itemForm.unit = item.unit
  itemForm.price = item.price
  itemForm.remark = item.remark
  showItemDialog.value = true
}

async function onItemSelect(itemId) {
  if (!itemId) {
    searchResults.value = []
    return
  }
  
  try {
    const res = await searchItems(itemForm.name)
    searchResults.value = res.list
  } catch (error) {
    console.error(error)
  }
}

watch(() => itemForm.name, async (val) => {
  if (val && val.length >= 1) {
    try {
      const res = await searchItems(val)
      searchResults.value = res.list
    } catch (error) {
      console.error(error)
    }
  } else {
    searchResults.value = []
  }
})

async function submitItem() {
  if (!itemFormRef.value) return
  
  try {
    await itemFormRef.value.validate()
    itemSubmitLoading.value = true
    
    if (editingItem.value) {
      await updateShoppingItem(currentList.value.id, editingItem.value.id, itemForm)
      ElMessage.success('更新成功')
    } else {
      await addShoppingItem(currentList.value.id, itemForm)
      ElMessage.success('添加成功')
    }
    
    showItemDialog.value = false
    selectList(currentList.value)
  } catch (error) {
    console.error(error)
  } finally {
    itemSubmitLoading.value = false
  }
}

function deleteItem(item) {
  ElMessageBox.confirm(`确定要删除物品"${item.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteShoppingItem(currentList.value.id, item.id)
      ElMessage.success('删除成功')
      selectList(currentList.value)
    } catch (error) {
      console.error(error)
    }
  }).catch(() => {})
}

function handlePurchase(item) {
  purchasingItem.value = item
  purchaseForm.price = item.price || 0
  purchaseForm.restock = !!item.item_id
  showPurchaseDialog.value = true
}

async function confirmPurchase() {
  if (!purchasingItem.value) return
  
  try {
    purchaseLoading.value = true
    await purchaseShoppingItem(
      currentList.value.id,
      purchasingItem.value.id,
      {
        purchased: true,
        restock: purchaseForm.restock,
        price: purchaseForm.price
      }
    )
    ElMessage.success('已标记为已购买')
    showPurchaseDialog.value = false
    selectList(currentList.value)
    loadStats()
    loadLists()
  } catch (error) {
    console.error(error)
  } finally {
    purchaseLoading.value = false
  }
}

async function handleUnpurchase(item) {
  try {
    await purchaseShoppingItem(currentList.value.id, item.id, { purchased: false })
    ElMessage.success('已取消购买标记')
    selectList(currentList.value)
    loadStats()
    loadLists()
  } catch (error) {
    console.error(error)
  }
}

async function handleExport() {
  try {
    const response = await exportShoppingList(currentList.value.id)
    const blob = response.data
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    
    let filename = `${currentList.value.name}.txt`
    const contentDisposition = response.headers['content-disposition']
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1])
      } else {
        const nameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (nameMatch && nameMatch[1]) {
          filename = decodeURIComponent(nameMatch[1])
        }
      }
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error(error)
  }
}

async function handleShare() {
  showShareDialog.value = true
  shareCode.value = ''
  try {
    const res = await generateShareCode(currentList.value.id)
    shareCode.value = res.share_code
  } catch (error) {
    console.error(error)
    ElMessage.error('生成分享链接失败')
  }
}

function copyShareLink() {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

function addFromExpiring() {
  ElMessage.info('请前往过期提醒页面选择物品添加')
}

function addFromLowStock() {
  ElMessage.info('请前往物品管理页面选择库存不足的物品添加')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

onMounted(() => {
  loadLists()
  loadStats()
})
</script>

<style scoped>
.list-card {
  margin-bottom: 20px;
}

.card-title {
  font-weight: 600;
  color: var(--color-brown-dark);
  font-size: 16px;
}

.shopping-list-sidebar {
  max-height: 400px;
  overflow-y: auto;
}

.list-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.list-item:hover {
  background-color: var(--color-cream);
}

.list-item.active {
  background-color: var(--color-light-green);
  border-color: var(--color-light-green-dark);
}

.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.list-name {
  font-weight: 500;
  color: var(--color-brown-dark);
  font-size: 14px;
}

.list-item-stats {
  font-size: 12px;
  color: var(--color-text-light);
}

.empty-lists {
  padding: 20px 0;
}

.stats-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: var(--color-cream);
  border-radius: 8px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--color-text-light);
  margin-bottom: 4px;
}

.stat-item .stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.stat-item .stat-value.primary {
  color: var(--color-light-green-dark);
}

.category-stats {
  margin-top: 12px;
}

.category-item {
  margin-bottom: 10px;
}

.category-name {
  font-size: 12px;
  color: var(--color-text);
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
}

.category-bar {
  height: 6px;
  background: var(--color-gray);
  border-radius: 3px;
  overflow: hidden;
}

.category-bar-fill {
  height: 100%;
  background: var(--color-light-green-dark);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.category-spent {
  font-size: 12px;
  color: var(--color-text-light);
  text-align: right;
  margin-top: 2px;
}

.detail-card {
  min-height: 500px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title span:first-child {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.detail-desc {
  font-size: 13px;
  color: var(--color-text-light);
}

.detail-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.quick-add-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.items-section {
  margin-bottom: 24px;
}

.items-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-gray);
}

.items-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.items-title.purchased-title {
  color: var(--color-text-light);
}

.items-count {
  font-size: 13px;
  color: var(--color-text-light);
}

.items-total {
  margin-left: auto;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-light-green-dark);
}

.shopping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.shopping-item:hover {
  background-color: var(--color-cream);
}

.shopping-item.purchased {
  opacity: 0.6;
}

.shopping-item.purchased .item-name {
  text-decoration: line-through;
  color: var(--color-text-light);
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-brown-dark);
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-text-light);
}

.item-qty {
  color: var(--color-text);
}

.item-price {
  color: var(--color-warning);
  font-weight: 500;
}

.item-price.actual {
  color: var(--color-light-green-dark);
}

.item-remark {
  font-style: italic;
  color: var(--color-text-light);
}

.item-purchased-date {
  color: var(--color-text-light);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.empty-items {
  padding: 30px 0;
}

.empty-detail-card {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.purchase-confirm {
  padding: 10px 0;
}

.share-content {
  padding: 10px 0;
}

.share-link {
  margin-top: 12px;
}
</style>
