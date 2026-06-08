<template>
  <view class="onboarding">
    <view class="progress-bar">
      <view class="progress-fill" :style="{ width: progressWidth }" />
    </view>

    <view class="step-info">
      <text class="step-text">{{ currentStep + 1 }} / {{ steps.length }}</text>
      <text class="step-title">{{ currentStepData.title }}</text>
    </view>

    <view class="options">
      <view
        v-for="option in currentStepData.options"
        :key="option"
        class="option-item"
        :class="{ selected: isSelected(option) }"
        @tap="selectOption(option)"
      >
        <text class="option-text">{{ option }}</text>
      </view>
    </view>

    <view class="actions">
      <button v-if="currentStep > 0" class="btn btn-prev" @tap="prevStep">上一步</button>
      <button class="btn btn-next" @tap="nextStep">
        {{ currentStep === steps.length - 1 ? '完成' : '下一步' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { GENDER_OPTIONS, AGE_OPTIONS, OCCUPATION_OPTIONS, DISEASE_OPTIONS } from '../../utils/constants'

const userStore = useUserStore()

const steps = [
  { key: 'gender', title: '你的性别', options: [...GENDER_OPTIONS], multiple: false },
  { key: 'ageRange', title: '你的年龄段', options: [...AGE_OPTIONS], multiple: false },
  { key: 'heightRange', title: '你的身高', options: generateRange(150, 195, 5, 'cm'), multiple: false },
  { key: 'weightRange', title: '你的体重', options: generateRange(40, 120, 5, 'kg'), multiple: false },
  { key: 'occupation', title: '你的职业类型', options: [...OCCUPATION_OPTIONS], multiple: false },
  { key: 'diseases', title: '你有哪些病史？（可多选）', options: [...DISEASE_OPTIONS], multiple: true },
]

function generateRange(min: number, max: number, step: number, unit: string): string[] {
  const result: string[] = []
  for (let i = min; i <= max; i += step) {
    result.push(`${i}${unit}`)
  }
  return result
}

const currentStep = ref(Math.min(userStore.onboardingStep, steps.length - 1))
const answers = ref<Record<string, any>>({ ...userStore.profile })

const currentStepData = computed(() => steps[currentStep.value])
const progressWidth = computed(() => `${((currentStep.value + 1) / steps.length) * 100}%`)

function isSelected(option: string): boolean {
  const step = currentStepData.value
  const val = answers.value[step.key]
  if (step.multiple) {
    return Array.isArray(val) && val.includes(option)
  }
  return val === option
}

function selectOption(option: string) {
  const step = currentStepData.value
  if (step.multiple) {
    const arr: string[] = answers.value[step.key] || []
    if (arr.includes(option)) {
      answers.value[step.key] = arr.filter((v) => v !== option)
    } else {
      answers.value[step.key] = [...arr, option]
    }
  } else {
    answers.value[step.key] = option
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
    userStore.setStep(currentStep.value)
  }
}

async function nextStep() {
  const step = currentStepData.value
  const val = answers.value[step.key]
  if (!val || (Array.isArray(val) && val.length === 0)) {
    uni.showToast({ title: '请选择至少一项', icon: 'none' })
    return
  }

  userStore.updateLocalProfile({ [step.key]: val })

  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    userStore.setStep(currentStep.value)
  } else {
    try {
      await userStore.saveProfile(answers.value)
      userStore.completeOnboarding()
      uni.reLaunch({ url: '/pages/index/index' })
    } catch {
      uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.onboarding {
  padding: 40rpx;
  min-height: 100vh;
  background: #fff;
}

.progress-bar {
  height: 8rpx;
  background: #eee;
  border-radius: 4rpx;
  margin-bottom: 60rpx;
}

.progress-fill {
  height: 100%;
  background: #07C160;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.step-info {
  margin-bottom: 60rpx;
}

.step-text {
  display: block;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.step-title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 80rpx;
}

.option-item {
  padding: 20rpx 40rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.option-item.selected {
  background: #e8f5e9;
  border-color: #07C160;
}

.option-text {
  font-size: 30rpx;
  color: #333;
}

.selected .option-text {
  color: #07C160;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 20rpx;
  position: fixed;
  bottom: 60rpx;
  left: 40rpx;
  right: 40rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  text-align: center;
}

.btn-prev {
  background: #f5f5f5;
  color: #666;
}

.btn-next {
  background: #07C160;
  color: #fff;
}
</style>
