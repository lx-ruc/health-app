<template>
  <view class="chat-page">
    <!-- Custom header -->
    <view class="chat-header">
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
          <text class="welcome-icon">🌿</text>
        </view>
        <text class="welcome-title">你的专属健康顾问</text>
        <text class="welcome-desc">基于你的习惯和指标数据，AI 将为你提供个性化建议</text>
        <view class="welcome-btn" @tap="startAnalysis">
          <text class="welcome-btn-text">开始健康分析</text>
        </view>
      </view>

      <view v-for="(msg, idx) in chatStore.messages" :key="idx" class="message" :class="msg.role">
        <view v-if="msg.role === 'assistant'" class="avatar-wrap">
          <text class="avatar">🌿</text>
        </view>
        <view class="bubble">
          <text class="bubble-text" selectable>{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="chatStore.sending" class="message assistant">
        <view class="avatar-wrap">
          <text class="avatar">🌿</text>
        </view>
        <view class="bubble typing">
          <view class="typing-dots">
            <view class="dot" /><view class="dot" /><view class="dot" />
          </view>
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
          placeholder-style="color: #B8B3AC;"
        />
      </view>
      <view class="send-btn" :class="{ disabled: !inputText.trim() || chatStore.sending }" @tap="send">
        <text class="send-text">↑</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useChatStore } from '../../stores/chat'

const chatStore = useChatStore()
const inputText = ref('')
const scrollTop = ref(0)

onMounted(() => {
  chatStore.loadHistory()
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
  nextTick(() => { scrollTop.value = 99999 })
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FAF7F2;
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

.action-text {
  font-size: 24rpx;
  color: #4A6741;
  font-weight: 500;
}

.chat-messages {
  flex: 1;
  padding: 20rpx 30rpx;
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

.welcome-icon {
  font-size: 56rpx;
}

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

.avatar {
  font-size: 28rpx;
}

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

.send-text {
  font-size: 32rpx;
  color: #FFFDF9;
  font-weight: 700;
}
</style>
