<template>
  <view class="home">
    <!-- Hero header -->
    <view class="hero">
      <view class="hero-inner">
        <text class="hero-greeting">{{ greeting }}</text>
        <text class="hero-date">{{ formattedDate }}</text>
      </view>
      <view class="hero-decoration">
        <view class="deco-circle deco-1" />
        <view class="deco-circle deco-2" />
        <view class="deco-circle deco-3" />
      </view>
    </view>

    <view class="content">
      <!-- Primary action card -->
      <view v-if="!habitStore.todayHabit" class="insight-card card-action" @tap="goHabit">
        <view class="insight-icon-wrap wrap-action">
          <text class="insight-icon">✎</text>
        </view>
        <view class="insight-body">
          <text class="insight-title">今日生活还未记录</text>
          <text class="insight-text">花 2 分钟记录今天的睡眠、饮食和运动，AI 才能给你更精准的建议。</text>
        </view>
        <text class="insight-arrow">›</text>
      </view>

      <view v-else class="insight-card card-done">
        <view class="insight-icon-wrap wrap-done">
          <text class="insight-icon">✓</text>
        </view>
        <view class="insight-body">
          <text class="insight-title">今日已记录</text>
          <view class="done-chips">
            <view v-if="habitStore.todayHabit.sleep_time" class="done-chip">
              <text class="done-chip-text">睡眠 {{ habitStore.todayHabit.sleep_time }}~{{ habitStore.todayHabit.wake_time }}</text>
            </view>
            <view v-if="habitStore.todayHabit.exercise_type" class="done-chip">
              <text class="done-chip-text">{{ habitStore.todayHabit.exercise_type }} {{ habitStore.todayHabit.exercise_duration }}分钟</text>
            </view>
            <view v-if="habitStore.todayHabit.work_type" class="done-chip">
              <text class="done-chip-text">{{ habitStore.todayHabit.work_type }}</text>
            </view>
          </view>
        </view>
        <text class="insight-link" @tap="goHabit">修改</text>
      </view>

      <!-- AI insights (static rules, no API call) -->
      <view class="section-header">
        <view class="section-dot" />
        <text class="section-title">健康洞察</text>
      </view>

      <view v-for="(item, idx) in insights" :key="idx" class="insight-card card-insight">
        <view class="insight-icon-wrap" :class="item.wrapClass">
          <text class="insight-icon">{{ item.icon }}</text>
        </view>
        <view class="insight-body">
          <text class="insight-title">{{ item.title }}</text>
          <text class="insight-text">{{ item.text }}</text>
        </view>
      </view>

      <!-- Metrics quick check-in -->
      <view v-if="metricStore.selectedMetrics.length > 0" class="insight-card card-action" @tap="goMetrics">
        <view class="insight-icon-wrap wrap-metrics">
          <text class="insight-icon">♥</text>
        </view>
        <view class="insight-body">
          <text class="insight-title">健康指标打卡</text>
          <text class="insight-text">{{ metricStore.selectedMetrics.length }} 项指标追踪中，今天记录了吗？</text>
        </view>
        <text class="insight-arrow">›</text>
      </view>
    </view>

    <!-- Guide overlay -->
    <view v-if="showGuide" class="guide-overlay" @tap="nextGuideStep">
      <view class="guide-mask" />
      <view class="guide-content" :style="{ top: guideSteps[guideStep].top }">
        <view class="guide-card">
          <view class="guide-step-bar">
            <view v-for="(_, i) in guideSteps" :key="i" class="step-bar-item" :class="{ active: i === guideStep }" />
          </view>
          <text class="guide-title">{{ guideSteps[guideStep].title }}</text>
          <text class="guide-desc">{{ guideSteps[guideStep].desc }}</text>
          <view class="guide-action">
            <text class="guide-btn-text">{{ guideStep === guideSteps.length - 1 ? '开始使用' : '点击继续' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHabitStore } from '../../stores/habit'
import { useMetricStore } from '../../stores/metric'
import { useUserStore } from '../../stores/user'
import { hasDoneGuide, setGuideDone } from '../../utils/storage'

const habitStore = useHabitStore()
const metricStore = useMetricStore()
const userStore = useUserStore()

const showGuide = ref(false)
const guideStep = ref(0)

const guideSteps = [
  { title: '欢迎使用健康追踪', desc: '记录你的日常生活，AI 会分析习惯与健康的关系，帮助你发现问题、改善状态。', top: '18%' },
  { title: '第一步：记录生活', desc: '每天花 2 分钟记录睡眠、饮食、运动。这是 AI 分析的基础，越详细越精准。', top: '35%' },
  { title: 'AI 为你解读', desc: '首页会根据你的记录自动生成健康洞察和建议，也会提醒你可能忽略的事项。', top: '50%' },
  { title: '开始吧', desc: '从记录今天的生活开始！你随时可以在「我的」修改个人资料。', top: '30%' },
]

const today = new Date()
const formattedDate = computed(() => {
  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
  return `${months[today.getMonth()]}${today.getDate()}日 ${weekdays[today.getDay()]}`
})

const greeting = computed(() => {
  const h = today.getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// Static insight rules (no AI call)
const insights = computed(() => {
  const items: { icon: string; title: string; text: string; wrapClass: string }[] = []
  const profile = userStore.profile
  const h = today.getHours()
  const hasHistory = habitStore.history.length > 0

  // Time-based tips
  if (h >= 23 || h < 2) {
    items.push({
      icon: '🌙', title: '该休息了', wrapClass: 'wrap-warn',
      text: '现在已经很晚了，规律的作息是健康的基石。建议尽快入睡，保证 7-8 小时睡眠。',
    })
  } else if (h >= 6 && h < 9) {
    items.push({
      icon: '☀', title: '新的一天', wrapClass: 'wrap-tip',
      text: '记得吃早餐，营养均衡的早餐能提升一整天的精力和专注力。',
    })
  }

  // Disease-based tips
  const diseases: string[] = profile?.diseases || []
  if (diseases.includes('高血压')) {
    items.push({
      icon: '💗', title: '血压管理提醒', wrapClass: 'wrap-warn',
      text: '你有高血压病史，建议减少盐分摄入，保持规律运动，每天监测血压。',
    })
  }
  if (diseases.includes('高血脂')) {
    items.push({
      icon: '🥗', title: '饮食建议', wrapClass: 'wrap-tip',
      text: '高血脂患者应减少油腻食物，多吃蔬菜和粗粮，适量运动有助于血脂控制。',
    })
  }
  if (diseases.includes('高尿酸')) {
    items.push({
      icon: '🍵', title: '尿酸控制', wrapClass: 'wrap-warn',
      text: '避免高嘌呤食物（海鲜、动物内脏、啤酒），多喝水促进尿酸排泄。',
    })
  }

  // Habit gap analysis
  if (!hasHistory && !habitStore.todayHabit) {
    items.push({
      icon: '📊', title: '开始积累数据', wrapClass: 'wrap-tip',
      text: '连续记录 3 天以上的生活数据后，AI 就能为你提供个性化的健康分析。',
    })
  }

  // Default if nothing specific
  if (items.length === 0) {
    items.push({
      icon: '🌿', title: '保持关注', wrapClass: 'wrap-tip',
      text: '持续记录生活习惯，AI 会越来越了解你的状态，给出更有针对性的建议。',
    })
  }

  return items
})

onMounted(() => {
  habitStore.fetchToday()
  habitStore.fetchHistory()
  metricStore.fetchConfig()
  userStore.fetchProfile()

  if (!hasDoneGuide()) {
    showGuide.value = true
  }
})

function nextGuideStep() {
  if (guideStep.value < guideSteps.length - 1) {
    guideStep.value++
  } else {
    showGuide.value = false
    setGuideDone()
  }
}

function goHabit() { uni.switchTab({ url: '/pages/habit/index' }) }
function goMetrics() { uni.switchTab({ url: '/pages/metrics/index' }) }
</script>

<style scoped>
.home { background: #FAF7F2; }

.hero {
  position: relative;
  background: linear-gradient(145deg, #4A6741 0%, #3A5634 40%, #2D4528 100%);
  padding: 100rpx 40rpx 60rpx;
  overflow: hidden;
}
.hero-inner { position: relative; z-index: 1; }
.hero-greeting { display: block; font-size: 48rpx; font-weight: 700; color: #FFFDF9; letter-spacing: 2rpx; }
.hero-date { display: block; font-size: 28rpx; color: rgba(255,253,249,0.65); margin-top: 8rpx; letter-spacing: 1rpx; }
.hero-decoration { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.deco-circle { position: absolute; border-radius: 50%; }
.deco-1 { width: 300rpx; height: 300rpx; background: rgba(200,120,92,0.12); top: -80rpx; right: -60rpx; }
.deco-2 { width: 180rpx; height: 180rpx; background: rgba(255,253,249,0.06); bottom: -40rpx; right: 100rpx; }
.deco-3 { width: 100rpx; height: 100rpx; background: rgba(200,120,92,0.08); top: 40rpx; right: 200rpx; }

.content { padding: 30rpx; margin-top: -20rpx; position: relative; z-index: 2; }

/* Section header */
.section-header { display: flex; align-items: center; margin: 24rpx 0 16rpx; }
.section-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #4A6741; margin-right: 10rpx; }
.section-title { font-size: 26rpx; font-weight: 600; color: #8B8680; letter-spacing: 1rpx; }

/* Insight cards */
.insight-card {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
  box-shadow: 0 2rpx 12rpx rgba(45,42,38,0.04);
}
.card-action {
  box-shadow: 0 4rpx 20rpx rgba(45,42,38,0.06);
  border: 1rpx solid #EDE8DF;
}
.card-done {
  border: 1rpx solid rgba(74,103,65,0.2);
}

.insight-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.wrap-action { background: rgba(200,120,92,0.12); }
.wrap-done { background: rgba(74,103,65,0.12); }
.wrap-tip { background: #EDE8DF; }
.wrap-warn { background: rgba(200,120,92,0.1); }
.wrap-metrics { background: rgba(107,126,154,0.12); }

.insight-icon { font-size: 32rpx; }

.insight-body { flex: 1; }
.insight-title { display: block; font-size: 28rpx; font-weight: 600; color: #2D2A26; margin-bottom: 6rpx; }
.insight-text { display: block; font-size: 24rpx; color: #5A5650; line-height: 1.6; }

.insight-arrow { font-size: 36rpx; color: #D4CFC7; margin-left: 8rpx; align-self: center; }
.insight-link { font-size: 24rpx; color: #4A6741; font-weight: 500; align-self: center; }

/* Done chips */
.done-chips { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.done-chip { background: #F5F0E8; padding: 6rpx 14rpx; border-radius: 10rpx; }
.done-chip-text { font-size: 22rpx; color: #5A5650; }

/* Guide overlay */
.guide-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
.guide-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(26,24,20,0.72); }
.guide-content { position: absolute; left: 50rpx; right: 50rpx; transition: top 0.4s cubic-bezier(0.4,0,0.2,1); }
.guide-card { background: #FFFDF9; border-radius: 28rpx; padding: 40rpx 36rpx 36rpx; box-shadow: 0 16rpx 48rpx rgba(26,24,20,0.3); }
.guide-step-bar { display: flex; gap: 8rpx; margin-bottom: 30rpx; }
.step-bar-item { height: 6rpx; flex: 1; border-radius: 3rpx; background: #EDE8DF; }
.step-bar-item.active { background: #4A6741; }
.guide-title { display: block; font-size: 36rpx; font-weight: 700; color: #2D2A26; margin-bottom: 16rpx; line-height: 1.3; }
.guide-desc { display: block; font-size: 28rpx; color: #5A5650; line-height: 1.7; margin-bottom: 30rpx; }
.guide-action { display: flex; justify-content: flex-end; }
.guide-btn-text { font-size: 26rpx; color: #4A6741; font-weight: 600; padding: 10rpx 24rpx; background: rgba(74,103,65,0.1); border-radius: 16rpx; }
</style>
