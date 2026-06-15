<template>
  <view class="history-page">
    <view class="section">
      <text class="section-title">慢性病</text>
      <view class="tag-grid">
        <view
          v-for="opt in DISEASE_OPTIONS"
          :key="opt"
          class="tag"
          :class="{ active: isSelected(draft.diseases, opt) }"
          @tap="toggle(draft.diseases, opt)"
        >
          <text class="tag-label">{{ opt }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">过敏史</text>
      <view class="tag-grid">
        <view
          v-for="opt in ALLERGY_OPTIONS"
          :key="opt"
          class="tag"
          :class="{ active: isSelected(draft.allergies, opt) }"
          @tap="toggle(draft.allergies, opt)"
        >
          <text class="tag-label">{{ opt }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">手术史</text>
      <view class="tag-grid">
        <view
          v-for="opt in SURGERY_OPTIONS"
          :key="opt"
          class="tag"
          :class="{ active: isSelected(draft.surgeryHistory, opt) }"
          @tap="toggle(draft.surgeryHistory, opt)"
        >
          <text class="tag-label">{{ opt }}</text>
        </view>
      </view>
    </view>

    <button class="save-btn" :loading="saving" @tap="onSave">保存</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { DISEASE_OPTIONS, ALLERGY_OPTIONS, SURGERY_OPTIONS } from '../../utils/constants'

const userStore = useUserStore()
const saving = ref(false)

interface HistoryDraft {
  diseases: string[]
  allergies: string[]
  surgeryHistory: string[]
}

const draft = reactive<HistoryDraft>({
  diseases: [],
  allergies: [],
  surgeryHistory: [],
})

onLoad(async () => {
  if (!userStore.profile || !userStore.profile.diseases) {
    await userStore.fetchProfile()
  }
  const p = userStore.profile || {}
  draft.diseases = [...(p.diseases || [])]
  draft.allergies = [...(p.allergies || [])]
  draft.surgeryHistory = [...(p.surgeryHistory || [])]
})

function isSelected(list: string[], opt: string): boolean {
  return list.includes(opt)
}

/**
 * 互斥切换：
 * - 选"无"会清空其他选项；
 * - 选其他选项会移除"无"；
 * - 普通选项切换选中态。
 */
function toggle(list: string[], opt: string) {
  const idx = list.indexOf(opt)
  if (opt === '无') {
    if (idx >= 0) {
      // 已选"无"，再次点击移除
      const i = list.indexOf(opt)
      if (i >= 0) list.splice(i, 1)
    } else {
      // 选"无"清空其他
      list.splice(0, list.length)
      list.push(opt)
    }
    return
  }
  // 普通选项：先移除"无"
  const noneIdx = list.indexOf('无')
  if (noneIdx >= 0) list.splice(noneIdx, 1)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.push(opt)
  }
}

async function onSave() {
  saving.value = true
  try {
    // 合并到完整 profile 后整体保存（后端 PUT 接受完整 profile 字段）
    await userStore.saveProfile({
      ...userStore.profile,
      diseases: draft.diseases,
      allergies: draft.allergies,
      surgeryHistory: draft.surgeryHistory,
    })
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
.history-page {
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
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx 28rpx;
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
</style>
