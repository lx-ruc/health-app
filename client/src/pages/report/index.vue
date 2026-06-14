<template>
  <view class="report-page">
    <view class="upload-area" @tap="chooseImage">
      <view v-if="!previewUrl" class="upload-placeholder">
        <view class="upload-icon-wrap">
          <image class="icon-svg-lg" :src="getIcon('camera', '#8B8680')" mode="aspectFit" />
        </view>
        <text class="upload-text">上传体检报告</text>
        <text class="upload-hint">拍照或从相册选择</text>
      </view>
      <image v-else :src="previewUrl" mode="aspectFit" class="preview-image" />
    </view>

    <view v-if="previewUrl" class="analyze-area">
      <view class="analyze-btn" :class="{ loading: analyzing || reading }" @tap="analyze">
        <text class="analyze-text">{{ analyzing ? '分析中...' : reading ? '读取图片...' : '开始 AI 分析' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { post } from '../../api'
import { getIcon } from '../../utils/icons'

const previewUrl = ref('')
const imageBase64 = ref('')
const analyzing = ref(false)
const reading = ref(false)

function chooseImage() {
  // 优先用 chooseMedia（mp-weixin 推荐 API），fallback 到旧 chooseImage
  const choose = (uni as any).chooseMedia || uni.chooseImage
  const opts: any = {
    count: 1,
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      // chooseMedia: res.tempFiles[].tempFilePath ;  chooseImage: res.tempFilePaths[]
      const tempPath = res.tempFilePaths?.[0] || res.tempFiles?.[0]?.tempFilePath || res.tempFiles?.[0]?.path
      if (!tempPath) {
        uni.showToast({ title: '选图失败：未拿到路径', icon: 'none' })
        return
      }
      readImageAsBase64(tempPath)
    },
    fail: (err: any) => {
      if (!err?.errMsg?.includes('cancel')) {
        uni.showToast({ title: '选图失败：' + (err?.errMsg || ''), icon: 'none' })
      }
    },
  }
  if ((uni as any).chooseMedia) {
    opts.mediaType = ['image']
  }
  choose(opts)
}

function readImageAsBase64(tempPath: string) {
  previewUrl.value = tempPath
  imageBase64.value = ''
  reading.value = true

  const fsm = (uni as any).getFileSystemManager?.()
  if (!fsm) {
    reading.value = false
    uni.showToast({ title: '当前环境不支持读取文件', icon: 'none' })
    return
  }

  const ext = tempPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const onFail = (err: any) => {
    reading.value = false
    const msg = err?.errMsg || err?.errMsg || '未知错误'
    // 给出更详细的诊断信息：路径 + 错误
    uni.showModal({
      title: '图片读取失败',
      content: `路径: ${tempPath.slice(0, 60)}...\n错误: ${msg}`,
      showCancel: false,
    })
  }

  fsm.readFile({
    filePath: tempPath,
    encoding: 'base64',
    success: (fileRes: any) => {
      if (!fileRes.data || fileRes.data.length < 100) {
        onFail({ errMsg: '读取到的数据为空或过短' })
        return
      }
      imageBase64.value = `data:${ext};base64,${fileRes.data as string}`
      reading.value = false
    },
    fail: onFail,
  })
}

async function analyze() {
  if (reading.value) {
    uni.showToast({ title: '图片读取中，请稍候', icon: 'none' })
    return
  }
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

.icon-svg-lg { width: 40rpx; height: 40rpx; }

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
