<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon><Postcard /></el-icon>
        标签打印
      </h2>
      <div class="header-actions">
        <el-select
          v-model="selectedTemplate"
          placeholder="选择标签模板"
          style="width: 200px"
          @change="loadTemplate"
        >
          <el-option
            v-for="t in templates"
            :key="t.id"
            :label="t.name + (t.is_default ? ' (默认)' : '')"
            :value="t.id"
          />
        </el-select>
        <el-button :icon="Setting" @click="goToTemplates">
          管理模板
        </el-button>
        <el-button type="primary" :icon="Printer" @click="handlePrint">
          打印标签
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>选择打印内容</span>
          </template>

          <el-tabs v-model="activeTab">
            <el-tab-pane label="按收纳盒" name="box">
              <el-select
                v-model="selectedBox"
                placeholder="选择收纳盒"
                style="width: 100%"
                clearable
                @change="generateByBox"
              >
                <el-option
                  v-for="box in boxList"
                  :key="box.id"
                  :label="box.name"
                  :value="box.id"
                />
              </el-select>
            </el-tab-pane>
            <el-tab-pane label="按物品" name="items">
              <el-select
                v-model="selectedItems"
                multiple
                placeholder="选择要打印的物品"
                style="width: 100%"
                @change="generateByItems"
              >
                <el-option
                  v-for="item in itemList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-tab-pane>
          </el-tabs>

          <el-divider />

          <div class="template-settings">
            <h4>标签样式设置</h4>
            <el-form label-width="100px" size="small">
              <el-form-item label="字体大小">
                <el-slider v-model="templateData.fontSize" :min="10" :max="24" @input="previewStyle" />
              </el-form-item>
              <el-form-item label="字体颜色">
                <el-color-picker v-model="templateData.fontColor" @change="previewStyle" />
              </el-form-item>
              <el-form-item label="背景颜色">
                <el-color-picker v-model="templateData.bgColor" @change="previewStyle" />
              </el-form-item>
              <el-form-item label="边框颜色">
                <el-color-picker v-model="templateData.borderColor" @change="previewStyle" />
              </el-form-item>
              <el-form-item label="显示二维码">
                <el-switch v-model="templateData.showQrCode" @change="previewStyle" />
              </el-form-item>
              <el-form-item label="显示日期">
                <el-switch v-model="templateData.showDate" @change="previewStyle" />
              </el-form-item>
              <el-form-item label="标签宽度">
                <el-slider v-model="templateData.width" :min="100" :max="400" @input="previewStyle" />
              </el-form-item>
              <el-form-item label="标签高度">
                <el-slider v-model="templateData.height" :min="50" :max="200" @input="previewStyle" />
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <span>标签预览（共 {{ labels.length }} 个）</span>
          </template>

          <div v-if="labels.length === 0" class="empty-state">
            <div class="empty-icon">🏷️</div>
            <p>请选择收纳盒或物品来生成标签</p>
          </div>

          <div v-else class="labels-preview" id="labels-print-area">
            <div
              v-for="(label, index) in labels"
              :key="index"
              class="label-item"
              :style="labelStyle"
            >
              <div class="label-content">
                <div class="label-title">{{ label.name }}</div>
                <div v-if="label.type === 'box'" class="label-sub">
                  {{ label.location }}
                </div>
                <div v-if="label.type === 'item'" class="label-sub">
                  {{ label.boxName }}
                </div>
                <div v-if="label.quantity" class="label-qty">
                  数量：{{ label.quantity }}{{ label.unit || '' }}
                </div>
                <div v-if="templateData.showDate && label.expireDate" class="label-date">
                  过期：{{ label.expireDate }}
                </div>
              </div>
              <div v-if="templateData.showQrCode" class="label-qr">
                <div class="qr-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Postcard, Printer, Setting, Picture } from '@element-plus/icons-vue'
import { generateLabels, getTemplates } from '@/api/labels'
import { getAllBoxes } from '@/api/boxes'
import { getItemList } from '@/api/items'

const route = useRoute()
const router = useRouter()

const activeTab = ref('box')
const selectedBox = ref(null)
const selectedItems = ref([])
const labels = ref([])
const templates = ref([])
const selectedTemplate = ref(null)
const boxList = ref([])
const itemList = ref([])

const templateData = reactive({
  fontSize: 14,
  fontColor: '#5D4E37',
  bgColor: '#FDF6E3',
  borderColor: '#8B7355',
  showQrCode: true,
  showDate: true,
  width: 200,
  height: 100
})

const labelStyle = computed(() => ({
  fontSize: templateData.fontSize + 'px',
  color: templateData.fontColor,
  backgroundColor: templateData.bgColor,
  borderColor: templateData.borderColor,
  width: templateData.width + 'px',
  height: templateData.height + 'px'
}))

async function loadBoxes() {
  const res = await getAllBoxes()
  boxList.value = res.list
}

async function loadItems() {
  const res = await getItemList({ pageSize: 100 })
  itemList.value = res.list
}

async function loadTemplateList() {
  const res = await getTemplates()
  templates.value = res.list
  const defaultTpl = res.list.find(t => t.is_default)
  if (defaultTpl) {
    selectedTemplate.value = defaultTpl.id
    Object.assign(templateData, defaultTpl.template_data)
  }
}

function loadTemplate(id) {
  const tpl = templates.value.find(t => t.id === id)
  if (tpl && tpl.template_data) {
    Object.assign(templateData, tpl.template_data)
  }
}

async function generateByBox() {
  if (!selectedBox.value) {
    labels.value = []
    return
  }
  
  try {
    const res = await generateLabels({
      box_id: selectedBox.value,
      template_id: selectedTemplate.value
    })
    labels.value = res.labels
    if (res.template?.template_data) {
      Object.assign(templateData, res.template.template_data)
    }
  } catch (error) {
    console.error(error)
  }
}

async function generateByItems() {
  if (selectedItems.value.length === 0) {
    labels.value = []
    return
  }
  
  try {
    const res = await generateLabels({
      item_ids: selectedItems.value,
      template_id: selectedTemplate.value
    })
    labels.value = res.labels
    if (res.template?.template_data) {
      Object.assign(templateData, res.template.template_data)
    }
  } catch (error) {
    console.error(error)
  }
}

function previewStyle() {
  // 样式会通过 computed 自动更新
}

function goToTemplates() {
  router.push('/templates')
}

function handlePrint() {
  if (labels.value.length === 0) {
    ElMessage.warning('请先生成标签')
    return
  }
  
  const printContent = document.getElementById('labels-print-area')
  if (!printContent) return
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.error('请允许弹出窗口以进行打印')
    return
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>标签打印</title>
      <style>
        body { padding: 20px; font-family: sans-serif; }
        .labels-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        .label-item {
          border: 2px solid ${templateData.borderColor};
          border-radius: 8px;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          font-size: ${templateData.fontSize}px;
          color: ${templateData.fontColor};
          background-color: ${templateData.bgColor};
          width: ${templateData.width}px;
          height: ${templateData.height}px;
        }
        .label-content { flex: 1; }
        .label-title { font-weight: bold; margin-bottom: 4px; }
        .label-sub { font-size: 0.8em; opacity: 0.8; margin-bottom: 4px; }
        .label-qty { font-size: 0.8em; margin-bottom: 4px; }
        .label-date { font-size: 0.75em; color: #e07a5f; }
        .label-qr { margin-left: 10px; }
        .qr-placeholder {
          width: 50px;
          height: 50px;
          border: 1px dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `)
  
  printWindow.document.close()
}

onMounted(() => {
  loadBoxes()
  loadItems()
  loadTemplateList()
  
  if (route.query.box_id) {
    selectedBox.value = parseInt(route.query.box_id)
    generateByBox()
  }
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.template-settings h4 {
  margin: 0 0 16px 0;
  color: var(--color-brown-dark);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-light);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.labels-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  min-height: 300px;
}

.label-item {
  border: 2px solid;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  transition: all 0.3s;
}

.label-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.label-sub {
  font-size: 0.8em;
  opacity: 0.8;
  margin-bottom: 4px;
}

.label-qty {
  font-size: 0.8em;
  margin-bottom: 4px;
}

.label-date {
  font-size: 0.75em;
  color: var(--color-danger);
}

.label-qr {
  margin-left: 10px;
}

.qr-placeholder {
  width: 50px;
  height: 50px;
  border: 1px dashed var(--color-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-text-light);
}
</style>
