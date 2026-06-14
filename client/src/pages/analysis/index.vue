<template>
  <view class="chat-page">
    <!-- Custom header -->
    <view class="chat-header" :style="{ paddingTop: headerPaddingTop + 'px', paddingBottom: '20rpx' }">
      <text class="header-title">AI 健康顾问</text>
      <view class="header-action" @tap="startNew">
        <text class="action-text">新对话</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="chat-messages"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view v-if="chatStore.messages.length === 0" class="welcome">
        <view class="welcome-icon-wrap">
          <image class="icon-svg-xl" :src="getIcon('leaf')" mode="aspectFit" />
        </view>
        <text class="welcome-title">你的专属健康顾问</text>
        <text class="welcome-desc">基于你的习惯和指标数据，AI 将为你提供个性化建议</text>
        <view class="welcome-btn" @tap="startAnalysis">
          <text class="welcome-btn-text">一键健康分析</text>
        </view>
        <view class="quick-actions">
          <view class="quick-chip interactive" @tap="ask('分析我的睡眠质量和作息规律')">
            <text class="quick-chip-text">睡眠分析</text>
          </view>
          <view class="quick-chip interactive" @tap="ask('分析我的运动习惯并给出建议')">
            <text class="quick-chip-text">运动建议</text>
          </view>
          <view class="quick-chip interactive" @tap="ask('分析我的饮食习惯，有哪些需要改进的')">
            <text class="quick-chip-text">饮食改善</text>
          </view>
        </view>
      </view>

      <view v-for="(msg, idx) in chatStore.messages" :key="idx" class="message" :class="msg.role">
        <view v-if="msg.role === 'assistant'" class="avatar-wrap">
          <image class="icon-svg-sm" :src="getIcon('leaf')" mode="aspectFit" />
        </view>
        <view class="bubble">
          <rich-text v-if="msg.role === 'assistant'" :nodes="renderAssistant(msg, idx)" />
          <text v-else class="bubble-text" selectable>{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="chatStore.lastError" class="retry-row">
        <view class="retry-btn" :class="{ disabled: chatStore.sending }" @tap="retry">
          <text class="retry-btn-text">{{ chatStore.sending ? '重试中...' : '重试' }}</text>
        </view>
      </view>

      <view v-if="chatStore.currentSuggestions.length" class="suggestions-panel">
        <view class="suggestions-header">
          <text class="suggestions-title">基于本次分析，推荐加入下周计划</text>
          <text class="suggestions-sub">勾选要加入的项目</text>
        </view>
        <view
          v-for="(s, i) in chatStore.currentSuggestions"
          :key="i"
          class="suggestion-card"
          :class="{ checked: selected[i], added: chatStore.suggestionsConsumed }"
          @tap="toggleSelect(i)"
        >
          <view class="suggestion-cat" :class="catClass(s.category)">{{ s.category }}</view>
          <view class="suggestion-body">
            <text class="suggestion-title">{{ s.title }}</text>
            <text v-if="s.detail" class="suggestion-detail">{{ s.detail }}</text>
          </view>
          <view class="suggestion-check">
            <text class="check-mark">{{ selected[i] ? '✓' : '' }}</text>
          </view>
        </view>
        <view
          class="suggestions-action"
          :class="{ disabled: !anySelected || chatStore.suggestionsConsumed }"
          @tap="addToPlan"
        >
          <text class="suggestions-action-text">
            {{ chatStore.suggestionsConsumed
              ? '已加入下周计划 ✓'
              : `加入选中项到下周计划 (${selectedCount})` }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="chat-input">
      <view class="input-wrap">
        <input
          class="msg-input"
          v-model="inputText"
          placeholder="问我关于健康的问题..."
          :disabled="chatStore.sending"
          @confirm="send"
          @keydown.enter="send"
          placeholder-style="color: #B8B3AC;"
        />
      </view>
      <view class="send-btn" :class="{ disabled: !inputText.trim() || chatStore.sending }" @tap="send">
        <image class="icon-svg-send" :src="getIcon('chevronRight', '#FFFDF9')" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useChatStore } from '../../stores/chat'
import { getIcon } from '../../utils/icons'
import { md } from '../../utils/markdown'

const chatStore = useChatStore()
const inputText = ref('')
const scrollTop = ref(0)
const headerPaddingTop = ref(40)

// mp-weixin: 算胶囊按钮底部位置作为 header 顶部 padding，避免被胶囊挡住
;(() => {
  // #ifdef MP-WEIXIN
  try {
    const menu = (uni as any).getMenuButtonBoundingClientRect?.()
    if (menu?.bottom) headerPaddingTop.value = menu.bottom + 8
  } catch {}
  // #endif
})()

// Suggestion panel state — default all selected to lower friction
const selected = ref<boolean[]>([])
watch(() => chatStore.currentSuggestions.length, (n) => {
  selected.value = new Array(n).fill(true)
})

const selectedCount = computed(() => selected.value.filter(Boolean).length)
const anySelected = computed(() => selectedCount.value > 0)

function toggleSelect(i: number) {
  if (chatStore.suggestionsConsumed) return
  selected.value[i] = !selected.value[i]
}

async function addToPlan() {
  if (!anySelected.value || chatStore.suggestionsConsumed) return
  const indices = selected.value
    .map((v, i) => (v ? i : -1))
    .filter((i) => i >= 0)
  uni.showLoading({ title: '添加中…' })
  try {
    const inserted = await chatStore.addToPlan(indices)
    uni.hideLoading()
    uni.showToast({
      title: inserted > 0 ? `已加入 ${inserted} 项` : '已在计划中',
      icon: 'success',
    })
    scrollToBottom()
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

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

// Throttled HTML cache for the streaming message.
// Without this, every SSE delta triggers a full markdown re-parse + rich-text rebuild,
// which is the dominant cause of perceived lag.
const streamingHtml = ref('')
const RENDER_THROTTLE_MS = 100
let renderTimer: ReturnType<typeof setTimeout> | null = null
let lastRenderTime = 0

function renderAssistant(msg: { content: string }, idx: number): string {
  const isStreaming = chatStore.sending && idx === chatStore.messages.length - 1
  if (!isStreaming) {
    return msg.content ? md(msg.content) : ''
  }
  // During streaming: return cached HTML (updated by throttled watcher)
  return streamingHtml.value + '<span class="typing-cursor">▎</span>'
}

function flushStreamHtml() {
  const last = chatStore.messages[chatStore.messages.length - 1]
  if (last && last.role === 'assistant') {
    streamingHtml.value = last.content ? md(last.content) : ''
  }
  lastRenderTime = Date.now()
}

function scheduleStreamRender() {
  if (renderTimer) return
  const wait = Math.max(0, RENDER_THROTTLE_MS - (Date.now() - lastRenderTime))
  renderTimer = setTimeout(() => {
    renderTimer = null
    flushStreamHtml()
  }, wait)
}

// Throttled scroll — every delta firing scrollToBottom just stacks nextTick work
let scrollTimer: ReturnType<typeof setTimeout> | null = null
function scheduleScrollToBottom() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    scrollToBottom()
  }, RENDER_THROTTLE_MS)
}

// Watch last message content — fires on every delta
watch(() => {
  const last = chatStore.messages[chatStore.messages.length - 1]
  return last ? (last.role + ':' + last.content.length) : ''
}, () => {
  if (chatStore.sending) {
    scheduleStreamRender()
    scheduleScrollToBottom()
  }
})

// Sending toggled: immediate typing feedback on start, full markdown on finish
watch(() => chatStore.sending, (sending, prev) => {
  if (!prev && sending) {
    streamingHtml.value = ''
    lastRenderTime = Date.now()
    scrollToBottom()
  } else if (prev && !sending) {
    if (renderTimer) { clearTimeout(renderTimer); renderTimer = null }
    flushStreamHtml()
    scrollToBottom()
  }
})

onMounted(() => {
  chatStore.loadHistory()
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
})

async function startAnalysis() {
  try {
    await chatStore.generateFirstAnalysis()
    scrollToBottom()
  } catch {
    uni.showToast({ title: '分析失败，请重试', icon: 'none' })
  }
}

async function send() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  try {
    await chatStore.sendMessage(text)
    scrollToBottom()
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function ask(question: string) {
  try {
    await chatStore.sendMessage(question)
    scrollToBottom()
  } catch {
    uni.showToast({ title: '分析失败，请重试', icon: 'none' })
  }
}

async function retry() {
  if (chatStore.sending) return
  try {
    await chatStore.retryLast()
    scrollToBottom()
  } catch {
    uni.showToast({ title: '重试失败', icon: 'none' })
  }
}

function startNew() {
  uni.showModal({
    title: '开始新对话',
    content: '将清空当前对话历史',
    success: async (res) => {
      if (res.confirm) await startAnalysis()
    },
  })
}

function scrollToBottom() {
  nextTick(() => { scrollTop.value = scrollTop.value === 99999 ? 99998 : 99999 })
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* iOS Safari 的 100vh 包含地址栏会切掉底部输入栏；dvh 是动态视口，更准 */
  height: 100dvh;
  background: #FAF7F2;
  /* 防止内容溢出导致整个页面被撑开、底部输入栏消失 */
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 80rpx 30rpx 20rpx;
  background: #FFFDF9;
}

.header-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2D2A26;
}

.header-action {
  padding: 10rpx 24rpx;
  background: rgba(74, 103, 65, 0.1);
  border-radius: 20rpx;
}

.retry-row {
  display: flex;
  justify-content: center;
  padding: 16rpx 0;
}
.retry-btn {
  padding: 14rpx 56rpx;
  background: #4A6741;
  border-radius: 24rpx;
}
.retry-btn.disabled { opacity: 0.6; }
.retry-btn-text { font-size: 26rpx; color: #FFFDF9; font-weight: 500; }

.action-text {
  font-size: 24rpx;
  color: #4A6741;
  font-weight: 500;
}

.chat-messages {
  flex: 1;
  /* 关键：默认 flex item 的 min-height 是 auto，会被内容撑开把输入栏挤出屏幕。
     min-height: 0 让它能在 flex 容器内正确收缩并触发滚动。 */
  min-height: 0;
  padding: 20rpx 30rpx;
  box-sizing: border-box;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100rpx;
}

.welcome-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 36rpx;
  background: rgba(74, 103, 65, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}

.icon-svg-xl { width: 52rpx; height: 52rpx; }

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 12rpx;
}

.welcome-desc {
  font-size: 26rpx;
  color: #8B8680;
  text-align: center;
  max-width: 500rpx;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.welcome-btn {
  background: #4A6741;
  padding: 20rpx 60rpx;
  border-radius: 24rpx;
}

.welcome-btn-text {
  font-size: 28rpx;
  color: #FFFDF9;
  font-weight: 500;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: center;
  margin-top: 24rpx;
}
.quick-chip {
  padding: 12rpx 24rpx;
  background: #F5F0E8;
  border-radius: 20rpx;
}
.quick-chip-text {
  font-size: 24rpx;
  color: #5A5650;
}

.message {
  display: flex;
  margin-bottom: 24rpx;
  align-items: flex-end;
  gap: 12rpx;
}

.message.user {
  justify-content: flex-end;
}

.avatar-wrap {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #EDE8DF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-svg-sm { width: 24rpx; height: 24rpx; }

.bubble {
  max-width: 68%;
  padding: 22rpx 26rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  line-height: 1.7;
}

.message.user .bubble {
  background: #4A6741;
  border-bottom-right-radius: 8rpx;
}

.message.user .bubble-text {
  color: #FFFDF9;
}

.message.assistant .bubble {
  background: #FFFDF9;
  border-bottom-left-radius: 8rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.06);
}

.message.assistant .bubble-text {
  color: #2D2A26;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-all;
}

/* Markdown rendered content */
.message.assistant .bubble :deep(.md-h1) { font-size: 32rpx; font-weight: 700; margin: 16rpx 0 8rpx; }
.message.assistant .bubble :deep(.md-h2) { font-size: 30rpx; font-weight: 700; margin: 14rpx 0 6rpx; color: #4A6741; }
.message.assistant .bubble :deep(.md-h3) { font-size: 28rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
.message.assistant .bubble :deep(.md-p) { margin: 6rpx 0; line-height: 1.7; }
.message.assistant .bubble :deep(.md-strong) { font-weight: 600; color: #4A6741; }
.message.assistant .bubble :deep(.md-ul), .message.assistant .bubble :deep(.md-ol) { padding-left: 32rpx; margin: 8rpx 0; }
.message.assistant .bubble :deep(.md-li) { margin: 4rpx 0; line-height: 1.6; }
.message.assistant .bubble :deep(.md-code) { background: #F5F0E8; padding: 2rpx 8rpx; border-radius: 6rpx; font-size: 24rpx; }
.message.assistant .bubble :deep(.md-hr) { border: none; border-top: 1rpx solid #EDE8DF; margin: 16rpx 0; }

.typing-cursor {
  color: #4A6741;
  animation: blink 0.8s infinite;
}
@keyframes blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }

.typing {
  padding: 20rpx 30rpx;
}

.typing-dots {
  display: flex;
  gap: 8rpx;
  align-items: center;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #B8B3AC;
}

.suggestions-panel {
  margin: 16rpx 0 24rpx;
  padding: 24rpx;
  background: #FFFDF9;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.06);
}

.suggestions-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.suggestions-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
}

.suggestions-sub {
  font-size: 22rpx;
  color: #8B8680;
  margin-top: 4rpx;
}

.suggestion-card {
  display: flex;
  align-items: center;
  padding: 18rpx 16rpx;
  margin-bottom: 12rpx;
  background: #FAF7F2;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.suggestion-card.checked {
  background: rgba(74, 103, 65, 0.06);
  border-color: rgba(74, 103, 65, 0.4);
}

.suggestion-card.added {
  opacity: 0.5;
}

.suggestion-cat {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 500;
  margin-right: 16rpx;
  color: #FFFDF9;
  background: #B8B3AC;
}

.cat-sleep { background: #5B7CB8; }
.cat-diet { background: #D89A4E; }
.cat-exercise { background: #4A8B5C; }
.cat-work { background: #8068B5; }
.cat-other { background: #8B8680; }

.suggestion-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.suggestion-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #2D2A26;
  line-height: 1.4;
}

.suggestion-detail {
  font-size: 22rpx;
  color: #8B8680;
  margin-top: 4rpx;
  line-height: 1.5;
}

.suggestion-check {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #D4CFC7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
}

.suggestion-card.checked .suggestion-check {
  background: #4A6741;
  border-color: #4A6741;
}

.check-mark {
  font-size: 24rpx;
  color: #FFFDF9;
  font-weight: 700;
}

.suggestions-action {
  margin-top: 16rpx;
  padding: 20rpx;
  background: #4A6741;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestions-action.disabled {
  background: #D4CFC7;
}

.suggestions-action-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #FFFDF9;
}

.chat-input {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FFFDF9;
  border-top: 1rpx solid #EDE8DF;
  align-items: center;
}

.input-wrap {
  flex: 1;
  background: #F5F0E8;
  border-radius: 24rpx;
  padding: 0 24rpx;
}

.msg-input {
  height: 72rpx;
  font-size: 28rpx;
  color: #2D2A26;
}

.send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #4A6741;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn.disabled {
  background: #D4CFC7;
}

.icon-svg-send { width: 24rpx; height: 24rpx; }
</style>
