<template>
  <view class="report-page">
    <view class="upload-area" @tap="chooseImage">
      <view v-if="!previewUrl" class="upload-placeholder">
        <text class="upload-icon">+</text>
        <text class="upload-text">点击上传体检报告</text>
        <text class="upload-hint">支持拍照或从相册选择</text>
      </view>
      <image v-else :src="previewUrl" mode="aspectFit" class="preview-image" />
    </view>

    <button
      v-if="previewUrl"
      class="analyze-btn"
      :loading="analyzing"
      @tap="analyze"
    >
      {{ analyzing ? '分析中...' : '开始分析' }}
    </button>
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
    const res = await post<{ id: number; ocrText: string; analysis: string }>('/report/analyze', {
      image: imageBase64.value,
    })
    uni.navigateTo({
      url: `/pages/report/result?id=${res.id}`,
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
}

.upload-area {
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx dashed #ccc;
  min-height: 400rpx;
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

.upload-icon {
  font-size: 80rpx;
  color: #ccc;
  line-height: 1;
}

.upload-text {
  font-size: 30rpx;
  color: #666;
  margin-top: 20rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.preview-image {
  width: 100%;
  height: 400rpx;
}

.analyze-btn {
  margin-top: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
}
</style>
