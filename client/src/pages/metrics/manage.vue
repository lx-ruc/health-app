<template>
  <view class="manage-page">
    <view class="sheet section">
      <text class="eyebrow section-eyebrow">预设指标</text>
      <view class="tag-grid">
        <view
          v-for="m in METRIC_OPTIONS"
          :key="m.key"
          class="chip tag"
          :class="{ active: isSelected(m.key) }"
          hover-class="press"
          @tap="togglePreset(m)"
        >
          <text class="tag-label">{{ m.label }}</text>
          <text class="tag-unit">{{ m.unit }}</text>
        </view>
      </view>
    </view>

    <view class="sheet section">
      <text class="eyebrow section-eyebrow">自定义指标</text>
      <view v-if="customMetrics.length === 0" class="empty-hint">
        <text>没有自定义指标时，可直接在下方添加</text>
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
      <button class="btn-quiet add-btn" @tap="openAddDialog">+ 添加自定义指标</button>
    </view>

    <button class="btn-primary save-btn" :loading="saving" @tap="onSave">保存</button>

    <!-- 自定义指标输入弹窗 -->
    <view v-if="dialogVisible" class="dialog-mask" @tap="closeAddDialog">
      <view class="sheet dialog" @tap.stop>
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
          <button class="btn-quiet dialog-cancel" @tap="closeAddDialog">取消</button>
          <button class="btn-primary dialog-confirm" @tap="confirmAdd">确定</button>
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
  padding: 24rpx 32rpx 200rpx;
  min-height: 100vh;
}

.section {
  padding: 30rpx 32rpx;
  margin-bottom: 32rpx;
}

.section-eyebrow {
  margin-bottom: 24rpx;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  width: calc(33.333% - 12rpx);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
}

.tag-label {
  font-size: 27rpx;
}

.tag-unit {
  font-size: 21rpx;
  color: var(--t3);
  margin-top: 6rpx;
}

.empty-hint {
  font-size: 25rpx;
  color: var(--t3);
  padding: 16rpx 0 20rpx;
}

.custom-list {
  margin-bottom: 20rpx;
}

.custom-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.custom-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.custom-label {
  font-size: 28rpx;
  color: var(--t1);
}

.custom-unit {
  font-size: 23rpx;
  color: var(--t3);
}

.remove-btn {
  font-size: 26rpx;
  color: var(--cinnabar);
}

.add-btn {
  height: 84rpx;
  line-height: 84rpx;
  font-size: 28rpx;
  margin-top: 8rpx;
}

.save-btn {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(32rpx + env(safe-area-inset-bottom));
}

/* ---- 弹窗 ---- */
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(28, 40, 35, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  width: 580rpx;
  padding: 40rpx 36rpx 28rpx;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t1);
  display: block;
  text-align: center;
  margin-bottom: 30rpx;
}

.dialog-field {
  margin-bottom: 24rpx;
}

.field-label {
  font-size: 25rpx;
  color: var(--t2);
  display: block;
  margin-bottom: 10rpx;
}

.field-input {
  height: 80rpx;
  background: var(--paper);
  border-radius: 14rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}

.dialog-cancel,
.dialog-confirm {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  font-size: 29rpx;
}
</style>
