<template>
  <view class="history-page">
    <view class="sheet section">
      <text class="eyebrow section-eyebrow">慢性病</text>
      <view class="tag-grid">
        <view
          v-for="opt in DISEASE_OPTIONS"
          :key="opt"
          class="chip"
          :class="{ active: isSelected(draft.diseases, opt) }"
          hover-class="press"
          @tap="toggle(draft.diseases, opt)"
        >
          <text>{{ opt }}</text>
        </view>
      </view>
    </view>

    <view class="sheet section">
      <text class="eyebrow section-eyebrow">过敏史</text>
      <view class="tag-grid">
        <view
          v-for="opt in ALLERGY_OPTIONS"
          :key="opt"
          class="chip"
          :class="{ active: isSelected(draft.allergies, opt) }"
          hover-class="press"
          @tap="toggle(draft.allergies, opt)"
        >
          <text>{{ opt }}</text>
        </view>
      </view>
    </view>

    <view class="sheet section">
      <text class="eyebrow section-eyebrow">手术史</text>
      <view class="tag-grid">
        <view
          v-for="opt in SURGERY_OPTIONS"
          :key="opt"
          class="chip"
          :class="{ active: isSelected(draft.surgeryHistory, opt) }"
          hover-class="press"
          @tap="toggle(draft.surgeryHistory, opt)"
        >
          <text>{{ opt }}</text>
        </view>
      </view>
    </view>

    <button class="btn-primary save-btn" :loading="saving" @tap="onSave">保存</button>
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

.save-btn {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(32rpx + env(safe-area-inset-bottom));
}
</style>
