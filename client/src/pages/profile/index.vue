<template>
  <view class="profile">
    <view class="section" v-for="field in fields" :key="field.key">
      <text class="label">{{ field.label }}</text>
      <view class="value-row">
        <picker
          v-if="!field.multiple"
          :range="field.options"
          @change="onPickerChange(field.key, $event)"
        >
          <text class="value">{{ profile[field.key] || '未填写' }}</text>
          <text class="arrow">></text>
        </picker>
        <view v-else class="multi-select" @tap="showMultiSelect(field)">
          <text class="value">{{ formatDiseases(profile[field.key]) }}</text>
          <text class="arrow">></text>
        </view>
      </view>
    </view>

    <button class="save-btn" @tap="save">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { GENDER_OPTIONS, AGE_OPTIONS, OCCUPATION_OPTIONS, DISEASE_OPTIONS } from '../../utils/constants'

const userStore = useUserStore()
const profile = ref<any>({ ...userStore.profile })

onMounted(() => {
  userStore.fetchProfile().then(() => {
    profile.value = { ...userStore.profile }
  })
})

const fields = [
  { key: 'gender', label: '性别', options: [...GENDER_OPTIONS] },
  { key: 'ageRange', label: '年龄段', options: [...AGE_OPTIONS] },
  { key: 'heightRange', label: '身高', options: generateRange(150, 195, 5) },
  { key: 'weightRange', label: '体重', options: generateRange(40, 120, 5) },
  { key: 'occupation', label: '职业', options: [...OCCUPATION_OPTIONS] },
  { key: 'diseases', label: '病史', options: [...DISEASE_OPTIONS], multiple: true },
]

function generateRange(min: number, max: number, step: number): string[] {
  const result: string[] = []
  for (let i = min; i <= max; i += step) result.push(`${i}`)
  return result
}

function onPickerChange(key: string, e: any) {
  const idx = e.detail.value
  const field = fields.find((f) => f.key === key)
  if (field) {
    profile.value[key] = field.options[idx]
  }
}

function showMultiSelect(field: any) {
  const current = profile.value[field.key] || []
  const selected = current.map((v: string) => field.options.indexOf(v)).filter((i: number) => i >= 0)
  // Simple approach: use uni.showActionSheet or a custom component
  // For v1, toggle the first unselected disease
  uni.showModal({
    title: field.label,
    content: `当前: ${formatDiseases(current)}\n请在引导页修改，或逐项编辑`,
    showCancel: false,
  })
}

function formatDiseases(val: string[] | undefined): string {
  if (!val?.length) return '未填写'
  return val.join('、')
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
  padding: 20rpx 40rpx;
}

.section {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #eee;
}

.label {
  font-size: 28rpx;
  color: #999;
  display: block;
  margin-bottom: 10rpx;
}

.value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.value {
  font-size: 32rpx;
  color: #333;
}

.arrow {
  color: #ccc;
  font-size: 28rpx;
}

.save-btn {
  margin-top: 60rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
}
</style>
