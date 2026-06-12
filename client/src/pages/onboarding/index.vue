<template>
  <view class="onboarding">
    <!-- Progress -->
    <view class="progress-track">
      <view class="progress-fill" :style="{ width: progressWidth }" />
      <view class="progress-dot" :style="{ left: progressWidth }" />
    </view>

    <view class="step-counter">
      <text class="counter-num">{{ currentStep + 1 }}</text>
      <text class="counter-total"> / {{ steps.length }}</text>
    </view>

    <text class="step-title">{{ currentStepData.title }}</text>

    <view class="options">
      <view
        v-for="option in currentStepData.options"
        :key="option"
        class="option-item"
        :class="{ selected: isSelected(option) }"
        @tap="selectOption(option)"
      >
        <view v-if="isSelected(option)" class="option-check">
          <text class="check-mark">✓</text>
        </view>
        <text class="option-text">{{ option }}</text>
      </view>
    </view>

    <view class="actions">
      <view v-if="currentStep > 0" class="btn btn-prev" @tap="prevStep">
        <text class="btn-text-prev">上一步</text>
      </view>
      <view v-if="currentStepData.multiple" class="btn btn-next" :class="{ 'btn-full': currentStep === 0 }" @tap="nextStep">
        <text class="btn-text-next">{{ currentStep === steps.length - 1 ? '开始使用' : '继续' }}</text>
      </view>
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
  { key: 'heightRange', title: '你的身高', options: ['150cm以下', '150-155cm', '155-160cm', '160-165cm', '165-170cm', '170-175cm', '175-180cm', '180-185cm', '185cm以上'], multiple: false },
  { key: 'weightRange', title: '你的体重', options: ['40kg以下', '40-50kg', '50-60kg', '60-70kg', '70-80kg', '80-90kg', '90-100kg', '100-110kg', '110kg以上'], multiple: false },
  { key: 'occupation', title: '你的职业类型', options: [...OCCUPATION_OPTIONS], multiple: false },
  { key: 'diseases', title: '你有哪些病史？', options: [...DISEASE_OPTIONS], multiple: true },
]

function generateRange(min: number, max: number, step: number, unit: string): string[] {
  const result: string[] = []
  for (let i = min; i <= max; i += step) result.push(`${i}${unit}`)
  return result
}

const currentStep = ref(Math.min(userStore.onboardingStep, steps.length - 1))
const answers = ref<Record<string, any>>({ ...userStore.profile })

const currentStepData = computed(() => steps[currentStep.value])
const progressWidth = computed(() => `${((currentStep.value + 1) / steps.length) * 100}%`)

function isSelected(option: string): boolean {
  const step = currentStepData.value
  const val = answers.value[step.key]
  if (step.multiple) return Array.isArray(val) && val.includes(option)
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
    userStore.updateLocalProfile({ [step.key]: option })
    if (currentStep.value < steps.length - 1) {
      setTimeout(() => {
        currentStep.value++
        userStore.setStep(currentStep.value)
      }, 300)
    } else {
      finishOnboarding()
    }
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
    finishOnboarding()
  }
}

async function finishOnboarding() {
  try {
    await userStore.saveProfile(answers.value)
    userStore.completeOnboarding()
    uni.reLaunch({ url: '/pages/index/index' })
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
</script>

<style scoped>
.onboarding {
  padding: 100rpx 40rpx 40rpx;
  min-height: 100vh;
  background: #FFFDF9;
}

.progress-track {
  height: 6rpx;
  background: #EDE8DF;
  border-radius: 3rpx;
  position: relative;
  margin-bottom: 50rpx;
}

.progress-fill {
  height: 100%;
  background: #4A6741;
  border-radius: 3rpx;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-dot {
  position: absolute;
  top: -8rpx;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: #4A6741;
  transform: translateX(-50%);
  transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-counter {
  margin-bottom: 16rpx;
}

.counter-num {
  font-size: 32rpx;
  font-weight: 700;
  color: #4A6741;
}

.counter-total {
  font-size: 28rpx;
  color: #8B8680;
}

.step-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #2D2A26;
  letter-spacing: 1rpx;
  margin-bottom: 50rpx;
  line-height: 1.3;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 100rpx;
}

.option-item {
  padding: 22rpx 36rpx;
  border-radius: 20rpx;
  background: #F5F0E8;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  gap: 10rpx;
  transition: all 0.25s ease;
}

.option-item.selected {
  background: rgba(74, 103, 65, 0.1);
  border-color: #4A6741;
}

.option-check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #4A6741;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-mark {
  font-size: 20rpx;
  color: #FFFDF9;
}

.option-text {
  font-size: 28rpx;
  color: #5A5650;
}

.selected .option-text {
  color: #4A6741;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 16rpx;
  position: fixed;
  bottom: 60rpx;
  left: 40rpx;
  right: 40rpx;
}

.btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
}

.btn-full {
  flex: 1;
}

.btn-prev {
  background: #F5F0E8;
}

.btn-text-prev {
  font-size: 30rpx;
  color: #5A5650;
  font-weight: 500;
}

.btn-next {
  background: #4A6741;
}

.btn-text-next {
  font-size: 30rpx;
  color: #FFFDF9;
  font-weight: 600;
  letter-spacing: 1rpx;
}
</style>
