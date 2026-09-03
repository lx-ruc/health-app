<template>
  <view class="history">
    <!-- 习惯 / 指标 分段 -->
    <view class="seg">
      <text :class="['seg-item', seg === 'habit' && 'active']" @tap="seg = 'habit'">习惯</text>
      <text :class="['seg-item', seg === 'metric' && 'active']" @tap="seg = 'metric'">指标</text>
    </view>

    <!-- 习惯段：按日列表（保持原有行为） -->
    <view v-if="seg === 'habit'">
      <view v-if="habitStore.history.length === 0" class="sheet empty">
        <text class="empty-text">还没有历史记录</text>
        <text class="empty-desc">在「习惯」页保存第一天，这里就会开始积累</text>
      </view>

      <view v-else class="list">
        <view
          v-for="item in habitStore.history"
          :key="item.date"
          class="sheet history-item"
          hover-class="press"
          @tap="showDetail(item)"
        >
          <view class="item-header">
            <text class="num item-date">{{ item.date }}</text>
            <text class="item-caret">›</text>
          </view>
          <view class="item-summary">
            <text v-if="item.sleep_time" class="summary-chip">睡眠 {{ item.sleep_time }}~{{ item.wake_time }}</text>
            <text v-if="item.exercise_type" class="summary-chip">{{ item.exercise_type }} {{ item.exercise_duration }}分钟</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 指标段：每指标一张趋势卡 -->
    <view v-else class="metric-cards">
      <MetricTrendCard
        v-for="card in metricCards"
        :key="card.metric.key"
        :metric="card.metric"
        :points="card.points"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { useHabitStore } from '../../stores/habit'
import { useMetricStore } from '../../stores/metric'
import { toPoints } from '../../utils/chart'
import MetricTrendCard from '../../components/MetricTrendCard.vue'

const habitStore = useHabitStore()
const metricStore = useMetricStore()

const seg = ref<'habit' | 'metric'>('habit')

/** 指标段数据：已选指标 → 升序点位（35 天一次拉取，窗口切换在卡片内切片） */
const metricCards = computed(() =>
  metricStore.selectedMetrics.map((metric) => ({
    metric,
    points: toPoints(metricStore.records, metric.key),
  })),
)

onMounted(() => {
  habitStore.fetchHistory()
})

// 支持 ?seg=metric 直达指标段（外部入口深链用）
onLoad((q) => {
  if (q?.seg === 'metric') seg.value = 'metric'
})

// onShow：从录入页返回时刷新指标数据（首次进入也会触发）
onShow(async () => {
  if (metricStore.selectedMetrics.length === 0) {
    await metricStore.fetchConfig()
  }
  metricStore.fetchRecords(undefined, 35)
})

function showDetail(item: any) {
  const lines = [
    `日期: ${item.date}`,
    item.sleep_time ? `睡眠: ${item.sleep_time} ~ ${item.wake_time}` : '',
    item.nap_duration ? `午休: ${item.nap_duration}分钟` : '',
    item.work_type ? `工作: ${item.work_type}` : '',
    item.breakfast ? `早餐: ${item.breakfast}` : '',
    item.lunch ? `午餐: ${item.lunch}` : '',
    item.dinner ? `晚餐: ${item.dinner}` : '',
    item.exercise_type ? `运动: ${item.exercise_type} ${item.exercise_duration}分钟` : '',
    item.steps ? `步数: ${item.steps}` : '',
  ].filter(Boolean).join('\n')

  uni.showModal({
    title: item.date,
    content: lines,
    showCancel: false,
  })
}
</script>

<style scoped>
.history {
  padding: 24rpx 32rpx 60rpx;
  min-height: 100vh;
}

/* ---- 分段切换 ---- */
.seg {
  display: flex;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 999rpx;
  padding: 5rpx;
  margin-bottom: 24rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 999rpx;
  font-size: 27rpx;
  color: var(--t2);
}

.seg-item.active {
  background: var(--moss-bg);
  color: var(--ink);
  font-weight: 600;
}

/* ---- 习惯段 ---- */
.empty {
  padding: 100rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
}

.empty-desc {
  font-size: 25rpx;
  color: var(--t3);
  margin-top: 14rpx;
}

.history-item {
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-date {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
  letter-spacing: 1rpx;
}

.item-caret {
  font-size: 30rpx;
  color: var(--t3);
}

.item-summary {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.summary-chip {
  font-size: 24rpx;
  color: var(--t2);
  background: var(--paper);
  border-radius: 999rpx;
  padding: 8rpx 22rpx;
}
</style>
