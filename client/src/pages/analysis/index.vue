<template>
  <view class="chat-page">
    <view class="chat-header">
      <view class="header-left">
        <text class="eyebrow">对话</text>
        <text class="header-title">AI 健康分析</text>
      </view>
      <text class="new-chat" @tap="startNew">新对话</text>
    </view>

    <scroll-view
      scroll-y
      class="chat-messages"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view v-if="chatStore.messages.length === 0" class="welcome">
        <view class="welcome-mark num">AI</view>
        <text class="welcome-title">问我生活习惯与指标的关系</text>
        <text class="welcome-desc">我会结合你的打卡记录、指标趋势和病史做分析</text>
        <button class="btn-primary welcome-btn" @tap="startAnalysis">开始第一次分析</button>
      </view>

      <view v-for="(msg, idx) in chatStore.messages" :key="idx" class="message" :class="msg.role">
        <view class="bubble">
          <text class="bubble-text" selectable>{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="chatStore.sending" class="message assistant">
        <view class="bubble typing">
          <view class="dot" />
          <view class="dot" />
          <view class="dot" />
        </view>
      </view>
    </scroll-view>

    <view class="chat-input">
      <input
        class="msg-input"
        v-model="inputText"
        placeholder="输入你的问题…"
        placeholder-class="ph"
        :disabled="chatStore.sending"
        @confirm="send"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || chatStore.sending"
        @tap="send"
      >
        发送
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useChatStore } from '../../stores/chat'

const chatStore = useChatStore()
const inputText = ref('')
const scrollTop = ref(0)

chatStore.loadHistory()

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

function startNew() {
  uni.showModal({
    title: '开始新对话',
    content: '将清空当前对话历史',
    success: async (res) => {
      if (res.confirm) {
        await startAnalysis()
      }
    },
  })
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999
  })
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ---- 头部 ---- */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 32rpx 26rpx;
}

.header-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--ink);
  margin-top: 6rpx;
}

.new-chat {
  font-size: 26rpx;
  color: var(--moss);
  padding: 8rpx 0 8rpx 24rpx;
}

/* ---- 消息区 ---- */
.chat-messages {
  flex: 1;
  padding: 8rpx 32rpx 20rpx;
  box-sizing: border-box;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 90rpx 40rpx 40rpx;
}

.welcome-mark {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid var(--ink);
  color: var(--ink);
  font-size: 40rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 36rpx;
}

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--t1);
}

.welcome-desc {
  font-size: 26rpx;
  color: var(--t3);
  margin: 16rpx 0 48rpx;
  text-align: center;
}

.welcome-btn {
  width: 380rpx;
}

.message {
  display: flex;
  margin-bottom: 26rpx;
  animation: rise 0.3s ease both;
}

.message.user { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }

.bubble {
  max-width: 76%;
  padding: 22rpx 28rpx;
  font-size: 28rpx;
  line-height: 1.7;
}

.message.user .bubble {
  background: var(--ink);
  color: #FFFFFF;
  border-radius: 24rpx 8rpx 24rpx 24rpx;
}

.message.assistant .bubble {
  background: var(--card);
  color: var(--t1);
  border: 1rpx solid var(--line);
  border-radius: 8rpx 24rpx 24rpx 24rpx;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-all;
}

/* 思考中的三个点 */
.bubble.typing {
  display: flex;
  gap: 10rpx;
  align-items: center;
  padding: 26rpx 30rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--t3);
  animation: blink 1.2s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

/* ---- 输入区 ---- */
.chat-input {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1rpx solid var(--line);
}

.msg-input {
  flex: 1;
  height: 76rpx;
  padding: 0 26rpx;
  background: var(--paper);
  border-radius: 16rpx;
  font-size: 28rpx;
}

.ph { color: var(--t3); }

.send-btn {
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 34rpx;
  background: var(--ink);
  color: #FFFFFF;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  margin: 0;
}

.send-btn[disabled] {
  background: #C6CFC9;
  color: #FFFFFF;
}

@keyframes rise {
  from { transform: translateY(12rpx); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
</style>
