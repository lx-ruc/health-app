<template>
  <view class="report-page">
    <view class="upload-area" @tap="chooseImage">
      <view v-if="!previewUrl" class="upload-placeholder">
        <view class="upload-icon-wrap">
          <text class="upload-icon">📷</text>
        </view>
        <text class="upload-text">上传体检报告</text>
        <text class="upload-hint">拍照或从相册选择</text>
      </view>
      <image v-else :src="previewUrl" mode="aspectFit" class="preview-image" />
    </view>

    <view v-if="previewUrl" class="analyze-area">
      <view class="analyze-btn" :class="{ loading: analyzing }" @tap="analyze">
        <text class="analyze-text">{{ analyzing ? '分析中...' : '开始 AI 分析' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { post } from '../../api'

const previewUrl = ref('')
const imageBase64 = ref('')
const analyzing = ref(false)

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempPath = res.tempFilePaths[0]
      previewUrl.value = tempPath
      uni.getFileSystemManager().readFile({
        filePath: tempPath,
        encoding: 'base64',
        success: (fileRes) => {
          const ext = tempPath.endsWith('.png') ? 'image/png' : 'image/jpeg'
          imageBase64.value = `data:${ext};base64,${fileRes.data as string}`
        },
      })
    },
  })
}

async function analyze() {
  if (!imageBase64.value) {
    uni.showToast({ title: '请先选择图片', icon: 'none' })
    return
  }
  analyzing.value = true
  try {
    const res = await post<{ ocrText: string; analysis: string }>('/report/analyze', { image: imageBase64.value })
    uni.navigateTo({
      url: `/pages/report/result?ocrText=${encodeURIComponent(res.ocrText)}&analysis=${encodeURIComponent(res.analysis)}`,
    })
  } catch (err: any) {
    uni.showToast({ title: err.message || '分析失败', icon: 'none' })
  } finally {
    analyzing.value = false
  }
}
</script>

<style scoped>
.report-page {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background: #FAF7F2;
}

.upload-area {
  background: #FFFDF9;
  border-radius: 24rpx;
  border: 2rpx dashed #D4CFC7;
  min-height: 420rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.upload-icon {
  font-size: 48rpx;
}

.upload-text {
  font-size: 30rpx;
  color: #2D2A26;
  font-weight: 500;
}

.upload-hint {
  font-size: 24rpx;
  color: #8B8680;
  margin-top: 8rpx;
}

.preview-image {
  width: 100%;
  height: 420rpx;
}

.analyze-area {
  margin-top: 40rpx;
}

.analyze-btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4A6741;
  border-radius: 24rpx;
}

.analyze-btn.loading {
  opacity: 0.7;
}

.analyze-text {
  font-size: 30rpx;
  color: #FFFDF9;
  font-weight: 600;
  letter-spacing: 1rpx;
}
</style>
