<template>
  <view class="profile">
    <view class="sheet group">
      <text class="eyebrow group-eyebrow">基本信息</text>
      <view class="cell" v-for="field in basicFields" :key="field.key">
        <text class="cell-label">{{ field.label }}</text>
        <picker
          class="cell-picker"
          :range="field.options"
          @change="onPickerChange(field.key, $event)"
        >
          <view class="cell-value-wrap">
            <text :class="['cell-value', !profile[field.key] && 'empty']">{{ profile[field.key] || '未填写' }}</text>
            <text class="cell-caret">›</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="sheet group">
      <text class="eyebrow group-eyebrow">病史</text>
      <view
        class="cell"
        v-for="field in historyFields"
        :key="field.key"
        hover-class="press"
        @tap="goHistory"
      >
        <text class="cell-label">{{ field.label }}</text>
        <view class="cell-value-wrap">
          <text :class="['cell-value', !formatList(profile[field.key]) && 'empty']">{{ formatList(profile[field.key]) }}</text>
          <text class="cell-caret">›</text>
        </view>
      </view>
      <text class="group-hint">慢性病、过敏史、手术史在「病史编辑」里维护</text>
    </view>

    <button class="btn-primary save-btn" @tap="save">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { GENDER_OPTIONS, AGE_OPTIONS, OCCUPATION_OPTIONS } from '../../utils/constants'

const userStore = useUserStore()
const profile = ref<any>({ ...userStore.profile })

onMounted(() => {
  userStore.fetchProfile().then(() => {
    profile.value = { ...userStore.profile }
  })
})

// 病史（慢性病/过敏/手术）在 history 页统一编辑，这里展示并跳转
const basicFields = [
  { key: 'gender', label: '性别', options: [...GENDER_OPTIONS] },
  { key: 'ageRange', label: '年龄段', options: [...AGE_OPTIONS] },
  { key: 'heightRange', label: '身高（cm）', options: generateRange(150, 195, 5) },
  { key: 'weightRange', label: '体重（kg）', options: generateRange(40, 120, 5) },
  { key: 'occupation', label: '职业', options: [...OCCUPATION_OPTIONS] },
]

const historyFields = [
  { key: 'diseases', label: '慢性病' },
  { key: 'allergies', label: '过敏史' },
  { key: 'surgeryHistory', label: '手术史' },
]

function generateRange(min: number, max: number, step: number): string[] {
  const result: string[] = []
  for (let i = min; i <= max; i += step) result.push(`${i}`)
  return result
}

function onPickerChange(key: string, e: any) {
  const idx = e.detail.value
  const field = basicFields.find((f) => f.key === key)
  if (field) {
    profile.value[key] = field.options[idx]
  }
}

function formatList(val: string[] | undefined): string {
  if (!val?.length) return ''
  return val.join('、')
}

function goHistory() {
  uni.navigateTo({ url: '/pages/profile/history' })
}

async function save() {
  try {
    await userStore.saveProfile(profile.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.profile {
  padding: 24rpx 32rpx 60rpx;
}

.group {
  padding: 8rpx 32rpx 20rpx;
  margin-bottom: 32rpx;
}

.group-eyebrow {
  padding: 26rpx 0 4rpx;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.group .cell:last-of-type {
  border-bottom: none;
}

.cell-label {
  font-size: 29rpx;
  color: var(--t1);
  font-weight: 500;
}

/* picker 宿主撑满剩余宽度：值靠右，同时扩大点击热区 */
.cell-picker {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.cell-value-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  /* 不用 max-width 百分比：picker 是内容自适应宽度，百分比上限解析失败会让值逐字竖排折行 */
}

.cell-value {
  font-size: 28rpx;
  color: var(--t2);
  max-width: 360rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-value.empty {
  color: var(--t3);
}

.cell-caret {
  font-size: 30rpx;
  color: var(--t3);
}

.group-hint {
  display: block;
  font-size: 23rpx;
  color: var(--t3);
  padding: 18rpx 0 10rpx;
}

.save-btn {
  margin-top: 48rpx;
}
</style>
