<template>
  <view class="onboarding">
    <view class="progress-track">
      <view class="progress-fill" :style="{ width: progressWidth }" />
    </view>

    <view class="step-info">
      <text class="eyebrow num">STEP {{ currentStep + 1 }} / {{ steps.length }}</text>
      <text class="step-title">{{ currentStepData.title }}</text>
    </view>

    <view class="options">
      <view
        v-for="option in currentStepData.options"
        :key="option"
        class="chip option-item"
        :class="{ selected: isSelected(option) }"
        hover-class="press"
        @tap="selectOption(option)"
      >
        <text class="option-text">{{ option }}</text>
      </view>
    </view>

    <view class="actions">
      <button v-if="currentStep > 0" class="btn-quiet btn-prev" @tap="prevStep">上一步</button>
      <button class="btn-primary btn-next" @tap="nextStep">
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
  padding: 40rpx 32rpx;
  min-height: 100vh;
}

.progress-track {
  height: 6rpx;
  background: #E3E9E4;
  border-radius: 999rpx;
  margin: 20rpx 8rpx 70rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--ink);
  border-radius: 999rpx;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-info {
  padding: 0 8rpx 56rpx;
}

.step-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--ink);
  margin-top: 14rpx;
  animation: rise 0.3s ease both;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  padding: 0 8rpx 80rpx;
}

.option-item {
  padding: 20rpx 38rpx;
}

.option-text {
  font-size: 29rpx;
}

.actions {
  display: flex;
  gap: 20rpx;
  position: fixed;
  bottom: calc(50rpx + env(safe-area-inset-bottom));
  left: 32rpx;
  right: 32rpx;
}

.btn-prev,
.btn-next {
  flex: 1;
}

@keyframes rise {
  from { transform: translateY(14rpx); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
</style>
