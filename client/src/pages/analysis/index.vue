<template>
  <view class="chat-page">
    <view class="chat-header">
      <text class="header-title">AI 健康分析</text>
      <text class="new-chat" @tap="startNew">新对话</text>
    </view>

    <scroll-view
      scroll-y
      class="chat-messages"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view v-if="chatStore.messages.length === 0" class="welcome">
        <text class="welcome-text">点击下方按钮，开始 AI 健康分析</text>
        <button class="start-btn" @tap="startAnalysis">开始分析</button>
      </view>

      <view v-for="(msg, idx) in chatStore.messages" :key="idx" class="message" :class="msg.role">
        <view class="bubble">
          <text class="bubble-text" selectable>{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="chatStore.sending" class="message assistant">
        <view class="bubble typing">
          <text class="bubble-text">正在思考...</text>
        </view>
      </view>
    </scroll-view>

    <view class="chat-input">
      <input
        class="msg-input"
        v-model="inputText"
        placeholder="输入你的问题..."
        :disabled="chatStore.sending"
        @confirm="send"
      />
      <button class="send-btn" :disabled="!inputText.trim() || chatStore.sending" @tap="send">
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
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.new-chat {
  font-size: 26rpx;
  color: #07C160;
}

.chat-messages {
  flex: 1;
  padding: 20rpx 30rpx;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.welcome-text {
  color: #999;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.start-btn {
  background: #07C160;
  color: #fff;
  font-size: 28rpx;
  padding: 16rpx 50rpx;
  border-radius: 12rpx;
}

.message {
  display: flex;
  margin-bottom: 24rpx;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 75%;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.message.user .bubble {
  background: #07C160;
  color: #fff;
}

.message.assistant .bubble {
  background: #fff;
  color: #333;
}

.bubble.typing {
  color: #999;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-all;
}

.chat-input {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
}

.msg-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.send-btn {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 30rpx;
  background: #07C160;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.send-btn[disabled] {
  background: #ccc;
}
</style>
