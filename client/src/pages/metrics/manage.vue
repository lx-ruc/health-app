<template>
  <view class="manage-page">
    <view class="section">
      <text class="section-title">预设指标</text>
      <view class="tag-grid">
        <view
          v-for="m in METRIC_OPTIONS"
          :key="m.key"
          class="tag"
          :class="{ active: isSelected(m.key) }"
          @tap="togglePreset(m)"
        >
          <text class="tag-label">{{ m.label }}</text>
          <text class="tag-unit">{{ m.unit }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">自定义指标</text>
      <view v-if="customMetrics.length === 0" class="empty-hint">
        <text>暂无自定义指标</text>
      </view>
      <view v-else class="custom-list">
        <view v-for="(m, idx) in customMetrics" :key="m.key" class="custom-row">
          <view class="custom-info">
            <text class="custom-label">{{ m.label }}</text>
            <text v-if="m.unit" class="custom-unit">{{ m.unit }}</text>
          </view>
          <text class="remove-btn" @tap="removeCustom(idx)">删除</text>
        </view>
      </view>
      <button class="add-btn" @tap="openAddDialog">+ 添加自定义指标</button>
    </view>

    <button class="save-btn" :loading="saving" @tap="onSave">保存</button>

    <!-- 自定义指标输入弹窗 -->
    <view v-if="dialogVisible" class="dialog-mask" @tap="closeAddDialog">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">添加自定义指标</text>
        <view class="dialog-field">
          <text class="field-label">名称</text>
          <input class="field-input" v-model="newLabel" placeholder="如：腰围" maxlength="20" />
        </view>
        <view class="dialog-field">
          <text class="field-label">单位</text>
          <input class="field-input" v-model="newUnit" placeholder="如：cm" maxlength="10" />
        </view>
        <view class="dialog-actions">
          <button class="dialog-cancel" @tap="closeAddDialog">取消</button>
          <button class="dialog-confirm" @tap="confirmAdd">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useMetricStore } from '../../stores/metric'
import { METRIC_OPTIONS, PRESET_METRIC_KEYS, type MetricItem } from '../../utils/constants'

const metricStore = useMetricStore()
const saving = ref(false)

// 本地编辑副本，保存时一次性提交
const draft = ref<MetricItem[]>([])

const dialogVisible = ref(false)
const newLabel = ref('')
const newUnit = ref('')

onLoad(async () => {
  if (metricStore.selectedMetrics.length === 0) {
    await metricStore.fetchConfig()
  }
  // 浅拷贝到 draft，避免直接修改 store
  draft.value = metricStore.selectedMetrics.map((m) => ({ ...m }))
})

const customMetrics = computed(() =>
  draft.value.filter((m) => !PRESET_METRIC_KEYS.has(m.key)),
)

function isSelected(key: string): boolean {
  return draft.value.some((m) => m.key === key)
}

function togglePreset(m: MetricItem) {
  const idx = draft.value.findIndex((x) => x.key === m.key)
  if (idx >= 0) {
    draft.value = draft.value.filter((_, i) => i !== idx)
  } else {
    draft.value = [...draft.value, { ...m }]
  }
}

function removeCustom(idx: number) {
  // idx 是 customMetrics 内的下标，需映射到 draft
  const target = customMetrics.value[idx]
  draft.value = draft.value.filter((m) => m.key !== target.key)
}

function openAddDialog() {
  newLabel.value = ''
  newUnit.value = ''
  dialogVisible.value = true
}

function closeAddDialog() {
  dialogVisible.value = false
}

function confirmAdd() {
  const label = newLabel.value.trim()
  if (!label) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  // 生成唯一 key：custom_ + 时间戳，与现有 key 冲突时追加随机后缀
  let key = `custom_${Date.now()}`
  while (draft.value.some((m) => m.key === key)) {
    key = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }
  draft.value = [
    ...draft.value,
    { key, label, unit: newUnit.value.trim() },
  ]
  dialogVisible.value = false
}

async function onSave() {
  if (draft.value.length === 0) {
    uni.showToast({ title: '至少选择一个指标', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await metricStore.saveConfig(draft.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.manage-page {
  padding: 20rpx 30rpx 120rpx;
  min-height: 100vh;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  width: calc(33.333% - 12rpx);
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid transparent;
}

.tag.active {
  background: #e6f7ee;
  border-color: #07C160;
}

.tag-label {
  font-size: 28rpx;
  color: #333;
}

.tag.active .tag-label {
  color: #07C160;
  font-weight: 600;
}

.tag-unit {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
  padding: 20rpx 0;
}

.custom-list {
  margin-bottom: 16rpx;
}

.custom-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.custom-info {
  flex: 1;
}

.custom-label {
  font-size: 28rpx;
  color: #333;
}

.custom-unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 12rpx;
}

.remove-btn {
  font-size: 26rpx;
  color: #e53935;
}

.add-btn {
  background: #f5f5f5;
  color: #07C160;
  font-size: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  margin-top: 8rpx;
}

.save-btn {
  position: fixed;
  left: 30rpx;
  right: 30rpx;
  bottom: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
}

.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  width: 560rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 36rpx 30rpx 24rpx;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 24rpx;
}

.dialog-field {
  margin-bottom: 20rpx;
}

.field-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.field-input {
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}

.dialog-cancel,
.dialog-confirm {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 12rpx;
  margin: 0;
}

.dialog-cancel {
  background: #f5f5f5;
  color: #666;
}

.dialog-confirm {
  background: #07C160;
  color: #fff;
}
</style>
