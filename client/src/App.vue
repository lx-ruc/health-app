<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { doLogin } from './api'
import { hasCompletedOnboarding } from './utils/storage'

onLaunch(async () => {
  try {
    await doLogin()
    if (!hasCompletedOnboarding()) {
      uni.reLaunch({ url: '/pages/onboarding/index' })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Login failed:', message)
  }
})
</script>

<style>
/* ============ 袖珍化验单 · 设计令牌 ============ */
page {
  /* 色板 */
  --paper: #F2F4F0;      /* 青瓷纸：页面底色 */
  --card: #FFFFFF;       /* 卡片 */
  --ink: #1C3A31;        /* 松墨：主按钮/关键数值 */
  --moss: #3E8375;       /* 苔绿：达标/激活 */
  --moss-bg: #E7F0EC;
  --amber: #A96E24;      /* 琥珀：待办/偏高 */
  --amber-bg: #F6EDDC;
  --cinnabar: #B5453C;   /* 朱砂：异常（克制使用） */
  --cinnabar-bg: #F8E9E7;
  /* 文字三级 */
  --t1: #22302B;
  --t2: #66766F;
  --t3: #9DAAA3;
  --line: #E2E8E3;

  background: var(--paper);
  color: var(--t1);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

/* 仪器读数字体：数值一律套 .num */
.num {
  font-family: 'DIN Alternate', 'Bahnschrift', 'Helvetica Neue', sans-serif;
  font-variant-numeric: tabular-nums;
}

/* ============ 纸卡 ============ */
.sheet {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 24rpx;
}

/* 按压反馈（配合 hover-class） */
.press {
  opacity: 0.68;
}

/* ============ 眉标 ============ */
.eyebrow {
  display: block;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: var(--t3);
  font-weight: 500;
}

/* ============ 按钮 ============ */
button::after {
  border: none;
}

.btn-primary {
  height: 92rpx;
  line-height: 92rpx;
  background: var(--ink);
  color: #FFFFFF;
  border-radius: 20rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  margin: 0;
}

.btn-primary[disabled] {
  background: #C6CFC9;
  color: #FFFFFF;
}

.btn-quiet {
  height: 92rpx;
  line-height: 92rpx;
  background: transparent;
  color: var(--t2);
  border: 1rpx solid var(--line);
  border-radius: 20rpx;
  font-size: 32rpx;
  text-align: center;
  margin: 0;
}

/* ============ 状态签（印章语义） ============ */
.tag-state {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.tag-state.ok    { color: var(--moss);     background: var(--moss-bg); }
.tag-state.todo  { color: var(--amber);    background: var(--amber-bg); }
.tag-state.bad   { color: var(--cinnabar); background: var(--cinnabar-bg); }

/* ============ 可选项 chip ============ */
.chip {
  padding: 14rpx 30rpx;
  border-radius: 14rpx;
  /* 白卡+细描边：在纸色页面与白色 sheet 内都有可见的容器感 */
  background: var(--card);
  border: 2rpx solid var(--line);
  font-size: 27rpx;
  color: var(--t1);
  text-align: center;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.chip.active {
  background: var(--moss-bg);
  border-color: var(--moss);
  color: var(--ink);
  font-weight: 600;
}

/* ============ 参考区间带（签名元素） ============ */
.band {
  position: relative;
  height: 10rpx;
  border-radius: 999rpx;
  background: #E9EEEA;
}

.band-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999rpx;
  background: #C9DED5;
}

.band-dot {
  position: absolute;
  top: 50%;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  border: 5rpx solid #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(28, 58, 49, 0.35);
  transform: translate(-50%, -50%);
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
}

.band-dot.ok   { background: var(--moss); }
.band-dot.high { background: var(--cinnabar); }
.band-dot.low  { background: var(--amber); }
</style>
