<template>
  <view class="profile-page">
    <view class="profile-header">
      <view class="avatar-circle">
        <text class="avatar-text">{{ profile.gender === '男' ? '♂' : '♀' }}</text>
      </view>
      <text class="profile-name">{{ profile.occupation || '未设置' }}</text>
      <text class="profile-sub">{{ profile.ageRange || '未填写' }} · {{ profile.heightRange || '--' }}</text>
    </view>

    <view class="fields-card">
      <view class="field-row" v-for="field in fields" :key="field.key">
        <text class="field-label">{{ field.label }}</text>
        <picker
          v-if="!field.multiple"
          :range="field.options"
          @change="onPickerChange(field.key, $event)"
        >
          <view class="field-value-wrap">
            <text :class="['field-value', !profile[field.key] && 'empty']">{{ profile[field.key] || '未填写' }}</text>
            <text class="field-arrow">›</text>
          </view>
        </picker>
        <view v-else class="field-value-wrap" @tap="showMultiSelect(field)">
          <text :class="['field-value', !profile[field.key]?.length && 'empty']">{{ formatDiseases(profile[field.key]) }}</text>
          <text class="field-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="save-area">
      <view class="save-btn" @tap="save">
        <text class="save-text">保存修改</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { GENDER_OPTIONS, AGE_OPTIONS, OCCUPATION_OPTIONS, DISEASE_OPTIONS } from '../../utils/constants'

const userStore = useUserStore()
const profile = ref<any>({ ...userStore.profile })

onMounted(() => {
  userStore.fetchProfile().then(() => { profile.value = { ...userStore.profile } })
})

const fields = [
  { key: 'gender', label: '性别', options: [...GENDER_OPTIONS] },
  { key: 'ageRange', label: '年龄段', options: [...AGE_OPTIONS] },
  { key: 'heightRange', label: '身高', options: ['150cm以下', '150-155cm', '155-160cm', '160-165cm', '165-170cm', '170-175cm', '175-180cm', '180-185cm', '185cm以上'] },
  { key: 'weightRange', label: '体重', options: ['40kg以下', '40-50kg', '50-60kg', '60-70kg', '70-80kg', '80-90kg', '90-100kg', '100-110kg', '110kg以上'] },
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
  if (field) profile.value[key] = field.options[idx]
}

function showMultiSelect(field: any) {
  const current = profile.value[field.key] || []
  uni.showModal({
    title: field.label,
    content: `当前: ${formatDiseases(current)}\n可在引导页重新修改`,
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
.profile-page {
  min-height: 100vh;
  background: #FAF7F2;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 30rpx 40rpx;
  background: #FFFDF9;
}

.avatar-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #EDE8DF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.avatar-text {
  font-size: 48rpx;
}

.profile-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #2D2A26;
}

.profile-sub {
  font-size: 26rpx;
  color: #8B8680;
  margin-top: 6rpx;
}

.fields-card {
  margin: 20rpx 30rpx;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 0 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  font-size: 28rpx;
  color: #5A5650;
}

.field-value-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.field-value {
  font-size: 28rpx;
  color: #2D2A26;
  font-weight: 500;
}

.field-value.empty {
  color: #B8B3AC;
}

.field-arrow {
  font-size: 32rpx;
  color: #D4CFC7;
}

.save-area {
  padding: 40rpx 30rpx;
}

.save-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4A6741;
  border-radius: 24rpx;
}

.save-text {
  font-size: 30rpx;
  color: #FFFDF9;
  font-weight: 600;
}
</style>
