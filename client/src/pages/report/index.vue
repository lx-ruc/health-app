<template>
  <view class="report-page">
    <view class="masthead">
      <text class="eyebrow">体检报告</text>
      <text class="masthead-title">上传报告，帮你解读</text>
    </view>

    <view class="sheet upload-area" hover-class="press" @tap="chooseImage">
      <view v-if="!previewUrl" class="upload-placeholder">
        <view class="upload-mark">
          <text class="upload-plus">+</text>
        </view>
        <text class="upload-text">上传体检报告</text>
        <text class="upload-hint">拍照或从相册选择，JPG / PNG</text>
      </view>
      <image v-else :src="previewUrl" mode="aspectFit" class="preview-image" />
    </view>

    <button
      v-if="previewUrl"
      class="btn-primary analyze-btn"
      :loading="analyzing"
      @tap="analyze"
    >
      {{ analyzing ? '识别中…' : '开始分析' }}
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
  padding: 40rpx 32rpx;
  min-height: 100vh;
}

.masthead {
  padding: 10rpx 8rpx 34rpx;
}

.masthead-title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--ink);
  margin-top: 12rpx;
}

.upload-area {
  border: 3rpx dashed #C9D4CD;
  min-height: 480rpx;
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

.upload-mark {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid #C9D4CD;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-plus {
  font-size: 64rpx;
  color: #C9D4CD;
  line-height: 1;
  margin-top: -8rpx;
}

.upload-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t1);
  margin-top: 30rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: var(--t3);
  margin-top: 12rpx;
}

.preview-image {
  width: 100%;
  height: 480rpx;
}

.analyze-btn {
  margin-top: 40rpx;
}
</style>
