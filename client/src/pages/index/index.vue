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
      <!-- Next-week plan (added by AI suggestions) -->
      <view v-if="planStore.nextWeekPlans.length" class="plan-section anim-card">
        <view class="plan-header">
          <text class="plan-title">下周计划</text>
          <text class="plan-sub">{{ planStore.nextWeekPlans.length }} 项 · {{ planWeekLabel }}</text>
        </view>
        <view v-for="p in planStore.nextWeekPlans" :key="p.id" class="plan-item" :class="{ done: !!p.done }">
          <view class="plan-cat" :class="catClass(p.category)">{{ p.category }}</view>
          <text class="plan-item-title">{{ p.title }}</text>
          <view class="plan-check-icon" @tap.stop="planStore.toggleDone(p.id)">
            <text class="plan-check-mark">{{ p.done ? '✓' : '○' }}</text>
          </view>
        </view>
      </view>
      <view v-else class="plan-section plan-empty anim-card" @tap="goAnalysis">
        <view class="plan-empty-icon">
          <image class="plan-empty-icon-img" :src="getIcon('leaf', '#4A6741')" mode="aspectFit" />
        </view>
        <view class="plan-empty-body">
          <text class="plan-empty-title">还没有下周计划</text>
          <text class="plan-empty-hint">去 AI 分析生成个性化建议 →</text>
        </view>
      </view>

      <!-- Primary action card -->
      <view v-if="!habitStore.todayHabit" class="action-card interactive anim-card" @tap="goHabit">
        <view class="action-icon-area">
          <image class="action-icon" :src="getIcon('edit', '#FFFDF9')" mode="aspectFit" />
        </view>
        <view class="action-body">
          <text class="action-title">今日生活还未记录</text>
          <text class="action-desc">花 2 分钟记录睡眠、饮食和运动</text>
        </view>
        <view class="action-chevron">
          <image class="chevron-icon" :src="getIcon('chevronRight', '#4A6741')" mode="aspectFit" />
        </view>
      </view>

      <view v-else class="done-card anim-card">
        <view class="done-icon-area">
          <image class="done-icon" :src="getIcon('check', '#FFFDF9')" mode="aspectFit" />
        </view>
        <view class="done-body">
          <text class="done-title">今日已记录</text>
          <view class="done-chips">
            <view v-if="habitStore.todayHabit.sleep_time" class="chip">
              <text class="chip-text">睡眠 {{ habitStore.todayHabit.sleep_time }}~{{ habitStore.todayHabit.wake_time }}</text>
            </view>
            <view v-if="habitStore.todayHabit.exercise_type" class="chip">
              <text class="chip-text">{{ habitStore.todayHabit.exercise_type }} {{ habitStore.todayHabit.exercise_duration }}min</text>
            </view>
            <view v-if="habitStore.todayHabit.work_type" class="chip">
              <text class="chip-text">{{ habitStore.todayHabit.work_type }}</text>
            </view>
          </view>
        </view>
        <text class="done-link" @tap="goHabit">修改</text>
      </view>

      <!-- Data overview -->
      <view class="section-label anim-card">
        <view class="section-dot" />
        <text class="section-title">数据概览</text>
      </view>

      <view class="chart-section anim-card">
        <view v-if="hasChartData" class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ avgSleep }}</text>
            <text class="stat-unit">h</text>
            <text class="stat-label">均睡</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-value">{{ totalExercise }}</text>
            <text class="stat-unit">min</text>
            <text class="stat-label">运动</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-value">{{ streakDays }}</text>
            <text class="stat-unit">天</text>
            <text class="stat-label">连续</text>
          </view>
        </view>

        <view class="chart-card">
          <text class="chart-title">近 7 天睡眠</text>
          <view v-if="hasChartData" class="bar-chart">
            <view v-for="(d, i) in weeklyData" :key="'s'+i" class="bar-col">
              <text v-if="d.sleepHours > 0" class="bar-val">{{ d.sleepHours }}</text>
              <view class="bar-track">
                <view class="bar-fill bar-sleep" :style="{ height: barH(d.sleepHours, 12) }" />
              </view>
              <text class="bar-day" :class="{ 'bar-today': i === 6 }">{{ d.day }}</text>
            </view>
          </view>
          <view v-else class="chart-empty">
            <text class="chart-empty-text">记录生活习惯后这里会显示睡眠趋势</text>
          </view>
        </view>

        <view class="chart-card">
          <text class="chart-title">近 7 天运动</text>
          <view v-if="hasChartData" class="bar-chart">
            <view v-for="(d, i) in weeklyData" :key="'e'+i" class="bar-col">
              <text v-if="d.exerciseMin > 0" class="bar-val">{{ d.exerciseMin }}</text>
              <view class="bar-track">
                <view class="bar-fill bar-exercise" :style="{ height: barH(d.exerciseMin, 120) }" />
              </view>
              <text class="bar-day" :class="{ 'bar-today': i === 6 }">{{ d.day }}</text>
            </view>
          </view>
          <view v-else class="chart-empty">
            <text class="chart-empty-text">记录运动数据后这里会显示运动趋势</text>
          </view>
        </view>
      </view>

      <!-- Health tools -->
      <view class="section-label anim-card">
        <view class="section-dot" />
        <text class="section-title">健康工具</text>
      </view>

      <view class="tools-row anim-card">
        <view class="tool-card interactive" @tap="goAnalysis">
          <view class="tool-icon-bg tool-ai">
            <image class="tool-icon" :src="getIcon('sparkle', '#4A6741')" mode="aspectFit" />
          </view>
          <text class="tool-name">AI 分析</text>
          <text class="tool-hint">个性化建议</text>
        </view>
        <view class="tool-card interactive" @tap="goReport">
          <view class="tool-icon-bg tool-report">
            <image class="tool-icon" :src="getIcon('fileText', '#C8785C')" mode="aspectFit" />
          </view>
          <text class="tool-name">体检报告</text>
          <text class="tool-hint">AI 识别</text>
        </view>
        <view class="tool-card interactive" @tap="goHistory">
          <view class="tool-icon-bg tool-history">
            <image class="tool-icon" :src="getIcon('calendar', '#6B7E9A')" mode="aspectFit" />
          </view>
          <text class="tool-name">历史记录</text>
          <text class="tool-hint">趋势回顾</text>
        </view>
      </view>

      <!-- AI insights -->
      <view class="section-label anim-card">
        <view class="section-dot" />
        <text class="section-title">健康洞察</text>
      </view>

      <view v-for="(item, idx) in insights" :key="idx" class="insight-card interactive anim-card" @tap="item.action">
        <view class="insight-icon-area" :class="item.wrapClass">
          <image class="insight-icon" :src="item.iconSrc" mode="aspectFit" />
        </view>
        <view class="insight-body">
          <text class="insight-title">{{ item.title }}</text>
          <text class="insight-text">{{ item.text }}</text>
        </view>
      </view>

      <!-- Metrics check-in -->
      <view v-if="metricStore.selectedMetrics.length > 0" class="action-card interactive anim-card" @tap="goMetrics">
        <view class="action-icon-area area-metrics">
          <image class="action-icon" :src="getIcon('heart', '#FFFDF9')" mode="aspectFit" />
        </view>
        <view class="action-body">
          <text class="action-title">健康指标打卡</text>
          <text class="action-desc">{{ metricStore.selectedMetrics.length }} 项指标追踪中</text>
        </view>
        <view class="action-chevron">
          <image class="chevron-icon" :src="getIcon('chevronRight', '#6B7E9A')" mode="aspectFit" />
        </view>
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
import { usePlanStore } from '../../stores/plan'
import { hasDoneGuide, setGuideDone } from '../../utils/storage'
import { getIcon } from '../../utils/icons'

const habitStore = useHabitStore()
const metricStore = useMetricStore()
const userStore = useUserStore()
const planStore = usePlanStore()

const planWeekLabel = computed(() => {
  const ws = planStore.weekStart
  if (!ws) return ''
  const d = new Date(ws)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}/${day} 起`
})

const CAT_CLASS_MAP: Record<string, string> = {
  睡眠: 'cat-sleep',
  饮食: 'cat-diet',
  运动: 'cat-exercise',
  工作: 'cat-work',
  其他: 'cat-other',
}
function catClass(category: string): string {
  return CAT_CLASS_MAP[category] || 'cat-other'
}

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

const goHabit = () => uni.switchTab({ url: '/pages/habit/index' })
const goMetrics = () => uni.switchTab({ url: '/pages/metrics/index' })
const goAnalysis = () => uni.switchTab({ url: '/pages/analysis/index' })
const goReport = () => uni.navigateTo({ url: '/pages/report/index' })
const goHistory = () => uni.navigateTo({ url: '/pages/history/index' })

const weeklyData = computed(() => {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const result: { day: string; date: string; recorded: boolean; sleepHours: number; exerciseMin: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const rec = habitStore.history.find((h: any) => h.date === dateStr)
    let sleepHours = 0
    if (rec?.sleep_time && rec?.wake_time) {
      const [sh, sm] = rec.sleep_time.split(':').map(Number)
      const [wh, wm] = rec.wake_time.split(':').map(Number)
      let mins = (wh * 60 + wm) - (sh * 60 + sm)
      if (mins < 0) mins += 24 * 60
      sleepHours = Math.round(mins / 6) / 10
    }
    result.push({ day: dayNames[d.getDay()], date: dateStr, recorded: !!rec, sleepHours, exerciseMin: rec?.exercise_duration || 0 })
  }
  return result
})

const hasChartData = computed(() => weeklyData.value.some(d => d.recorded))

const avgSleep = computed(() => {
  const valid = weeklyData.value.filter(d => d.sleepHours > 0)
  if (!valid.length) return '--'
  return (valid.reduce((s, d) => s + d.sleepHours, 0) / valid.length).toFixed(1)
})

const totalExercise = computed(() => weeklyData.value.reduce((s, d) => s + d.exerciseMin, 0))

const streakDays = computed(() => {
  let c = 0
  for (let i = weeklyData.value.length - 1; i >= 0; i--) {
    if (weeklyData.value[i].recorded) c++
    else break
  }
  return c
})

function barH(val: number, max: number) {
  if (val <= 0) return '4rpx'
  return Math.max(8, (val / max) * 100) + '%'
}

const insights = computed(() => {
  const items: { iconSrc: string; title: string; text: string; wrapClass: string; action: () => void }[] = []
  const profile = userStore.profile
  const h = today.getHours()
  const hasHistory = habitStore.history.length > 0

  if (h >= 23 || h < 2) {
    items.push({
      iconSrc: getIcon('moon', '#C8785C'), title: '该休息了', wrapClass: 'wrap-warn',
      text: '现在已经很晚了，规律的作息是健康的基石。建议尽快入睡，保证 7-8 小时睡眠。',
      action: goHabit,
    })
  } else if (h >= 6 && h < 9) {
    items.push({
      iconSrc: getIcon('sun'), title: '新的一天', wrapClass: 'wrap-tip',
      text: '记得吃早餐，营养均衡的早餐能提升一整天的精力和专注力。',
      action: goHabit,
    })
  }

  const diseases: string[] = profile?.diseases || []
  if (diseases.includes('高血压')) {
    items.push({
      iconSrc: getIcon('heart', '#C8785C'), title: '血压管理提醒', wrapClass: 'wrap-warn',
      text: '你有高血压病史，建议减少盐分摄入，保持规律运动，每天监测血压。',
      action: goAnalysis,
    })
  }
  if (diseases.includes('高血脂')) {
    items.push({
      iconSrc: getIcon('utensils'), title: '饮食建议', wrapClass: 'wrap-tip',
      text: '高血脂患者应减少油腻食物，多吃蔬菜和粗粮，适量运动有助于血脂控制。',
      action: goAnalysis,
    })
  }
  if (diseases.includes('高尿酸')) {
    items.push({
      iconSrc: getIcon('cup', '#C8785C'), title: '尿酸控制', wrapClass: 'wrap-warn',
      text: '避免高嘌呤食物（海鲜、动物内脏、啤酒），多喝水促进尿酸排泄。',
      action: goAnalysis,
    })
  }

  if (!hasHistory && !habitStore.todayHabit) {
    items.push({
      iconSrc: getIcon('barChart'), title: '开始积累数据', wrapClass: 'wrap-tip',
      text: '连续记录 3 天以上的生活数据后，AI 就能为你提供个性化的健康分析。',
      action: goHabit,
    })
  }

  if (items.length === 0) {
    items.push({
      iconSrc: getIcon('leaf'), title: '保持关注', wrapClass: 'wrap-tip',
      text: '持续记录生活习惯，AI 会越来越了解你的状态，给出更有针对性的建议。',
      action: goAnalysis,
    })
  }

  return items
})

onMounted(() => {
  habitStore.fetchToday()
  const end = new Date().toISOString().slice(0, 10)
  const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  habitStore.fetchHistory(start, end)
  metricStore.fetchConfig()
  userStore.fetchProfile()
  planStore.fetchNextWeekPlans()

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
</script>

<style scoped>
.home { background: #FAF7F2; }

/* ── Hero ── */
.hero {
  position: relative;
  background: linear-gradient(155deg, #4A6741 0%, #3D5A38 35%, #2D4528 100%);
  padding: 108rpx 40rpx 64rpx;
  overflow: hidden;
}
.hero-inner { position: relative; z-index: 1; }
.hero-greeting { display: block; font-size: 48rpx; font-weight: 700; color: #FFFDF9; letter-spacing: 2rpx; }
.hero-date { display: block; font-size: 26rpx; color: rgba(255,253,249,0.55); margin-top: 8rpx; letter-spacing: 1rpx; font-weight: 400; }
.hero-decoration { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.deco-circle { position: absolute; border-radius: 50%; }
.deco-1 { width: 280rpx; height: 280rpx; background: rgba(200,120,92,0.1); top: -60rpx; right: -40rpx; }
.deco-2 { width: 160rpx; height: 160rpx; background: rgba(255,253,249,0.05); bottom: -30rpx; right: 100rpx; }
.deco-3 { width: 80rpx; height: 80rpx; background: rgba(200,120,92,0.07); top: 50rpx; right: 200rpx; }

/* ── Content area ── */
.content { padding: 0 30rpx 30rpx; margin-top: -24rpx; position: relative; z-index: 2; }

/* Next-week plan section */
.plan-section {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.05);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.plan-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2D2A26;
}

.plan-sub {
  font-size: 22rpx;
  color: #8B8680;
}

.plan-item {
  display: flex;
  align-items: center;
  padding: 16rpx 12rpx;
  margin-bottom: 8rpx;
  background: #FAF7F2;
  border-radius: 14rpx;
}

.plan-item.done {
  opacity: 0.5;
}

.plan-item.done .plan-item-title {
  text-decoration: line-through;
}

.plan-cat {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
  font-weight: 500;
  color: #FFFDF9;
  background: #8B8680;
  margin-right: 14rpx;
}

.cat-sleep { background: #5B7CB8; }
.cat-diet { background: #D89A4E; }
.cat-exercise { background: #4A8B5C; }
.cat-work { background: #8068B5; }
.cat-other { background: #8B8680; }

.plan-item-title {
  flex: 1;
  font-size: 26rpx;
  color: #2D2A26;
  line-height: 1.4;
}

.plan-check-icon {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
}

.plan-check-mark {
  font-size: 28rpx;
  color: #4A6741;
}

.plan-empty {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.plan-empty-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(74, 103, 65, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.plan-empty-icon-img { width: 32rpx; height: 32rpx; }

.plan-empty-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.plan-empty-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
}

.plan-empty-hint {
  font-size: 22rpx;
  color: #8B8680;
  margin-top: 4rpx;
}

/* ── Section labels ── */
.section-label { display: flex; align-items: center; margin: 28rpx 0 16rpx; }
.section-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #4A6741; margin-right: 10rpx; }
.section-title { font-size: 24rpx; font-weight: 600; color: #8B8680; letter-spacing: 2rpx; }

/* ── Action card (primary CTA) ── */
.action-card {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 16rpx rgba(45,42,38,0.06);
}
.action-icon-area {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: #4A6741;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.area-metrics { background: #6B7E9A; }
.action-icon { width: 30rpx; height: 30rpx; }
.action-body { flex: 1; min-width: 0; }
.action-title { display: block; font-size: 28rpx; font-weight: 600; color: #2D2A26; margin-bottom: 4rpx; }
.action-desc { display: block; font-size: 24rpx; color: #8B8680; }
.action-chevron { width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chevron-icon { width: 20rpx; height: 20rpx; opacity: 0.4; }

/* ── Done card ── */
.done-card {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid rgba(74,103,65,0.15);
}
.done-icon-area {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: rgba(74,103,65,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.done-icon { width: 30rpx; height: 30rpx; }
.done-body { flex: 1; min-width: 0; }
.done-title { display: block; font-size: 28rpx; font-weight: 600; color: #2D2A26; margin-bottom: 8rpx; }
.done-chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.chip { background: #F5F0E8; padding: 4rpx 14rpx; border-radius: 8rpx; }
.chip-text { font-size: 22rpx; color: #5A5650; }
.done-link { font-size: 24rpx; color: #4A6741; font-weight: 500; flex-shrink: 0; padding: 8rpx 16rpx; }

/* ── Chart section ── */
.chart-section { margin-bottom: 8rpx; }

.stats-row {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 16rpx rgba(45,42,38,0.06);
}
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 40rpx; font-weight: 700; color: #2D2A26; line-height: 1; }
.stat-unit { font-size: 20rpx; color: #8B8680; margin-top: 4rpx; }
.stat-label { font-size: 20rpx; color: #B8B3AC; margin-top: 4rpx; }
.stat-divider { width: 1rpx; height: 60rpx; background: #EDE8DF; }

.chart-card {
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(45,42,38,0.04);
}
.chart-title { font-size: 22rpx; font-weight: 600; color: #8B8680; letter-spacing: 1rpx; margin-bottom: 24rpx; display: block; }

.bar-chart { display: flex; align-items: flex-end; height: 200rpx; gap: 8rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-val { font-size: 18rpx; color: #8B8680; margin-bottom: 4rpx; }
.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar-fill {
  width: 70%;
  border-radius: 8rpx 8rpx 4rpx 4rpx;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 4rpx;
}
.bar-sleep { background: linear-gradient(180deg, #4A6741 0%, #5C7A53 100%); }
.bar-exercise { background: linear-gradient(180deg, #C8785C 0%, #D48E74 100%); }
.bar-day { font-size: 18rpx; color: #B8B3AC; margin-top: 10rpx; }
.bar-today { color: #4A6741; font-weight: 600; }

.chart-empty {
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-empty-text { font-size: 24rpx; color: #B8B3AC; }

/* ── Tools row ── */
.tools-row { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.tool-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 28rpx 12rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(45,42,38,0.04);
}
.tool-icon-bg {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14rpx;
}
.tool-ai { background: rgba(74,103,65,0.1); }
.tool-report { background: rgba(200,120,92,0.1); }
.tool-history { background: rgba(107,126,154,0.1); }
.tool-icon { width: 30rpx; height: 30rpx; }
.tool-name { font-size: 26rpx; color: #2D2A26; font-weight: 600; margin-bottom: 2rpx; }
.tool-hint { font-size: 20rpx; color: #8B8680; }

/* ── Insight cards ── */
.insight-card {
  display: flex;
  align-items: flex-start;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 1rpx 8rpx rgba(45,42,38,0.03);
}
.insight-icon-area {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}
.wrap-tip { background: #EDE8DF; }
.wrap-warn { background: rgba(200,120,92,0.1); }
.insight-icon { width: 24rpx; height: 24rpx; }
.insight-body { flex: 1; min-width: 0; }
.insight-title { display: block; font-size: 26rpx; font-weight: 600; color: #2D2A26; margin-bottom: 4rpx; }
.insight-text { display: block; font-size: 22rpx; color: #8B8680; line-height: 1.6; }

/* ── Guide overlay ── */
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
