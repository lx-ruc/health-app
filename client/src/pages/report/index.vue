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

    <view v-if="previewUrl && !analyzing" class="analyze-area">
      <view class="analyze-btn" @tap="analyze">
        <text class="analyze-text">开始 AI 分析</text>
      </view>
    </view>

    <!-- 模拟进度（基于时间估算，不依赖 SSE 流式） -->
    <view v-if="analyzing" class="progress-card">
      <view class="progress-header">
        <view class="spinner" />
        <text class="progress-title">{{ progressTitle }}</text>
      </view>
      <view class="steps">
        <view class="step" :class="stepStatus('upload')">
          <text class="step-icon">{{ stepIcon('upload') }}</text>
          <text class="step-label">上传图片</text>
        </view>
        <view class="step" :class="stepStatus('ocr')">
          <text class="step-icon">{{ stepIcon('ocr') }}</text>
          <text class="step-label">OCR 识别</text>
        </view>
        <view class="step" :class="stepStatus('ai')">
          <text class="step-icon">{{ stepIcon('ai') }}</text>
          <text class="step-label">AI 分析异常</text>
        </view>
      </view>
      <text class="progress-tip">整个过程约 30-60 秒，请耐心等待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { post } from '../../api'
import { getIcon } from '../../utils/icons'

const previewUrl = ref('')
const imageBase64 = ref('')
const analyzing = ref(false)
const reading = ref(false)
const currentStep = ref<'upload' | 'ocr' | 'ai' | 'done'>('upload')

// 时间驱动的模拟进度（OCR 通常 5-15s，AI 通常 10-30s）
const OCR_THRESHOLD_MS = 3000
const AI_THRESHOLD_MS = 12000
let stepTimer: any = null

const progressTitle = computed(() => {
  switch (currentStep.value) {
    case 'upload': return '上传中...'
    case 'ocr': return '正在识别文字内容...（PaddleOCR）'
    case 'ai': return '正在分析异常指标...（DeepSeek）'
    case 'done': return '完成'
    default: return ''
  }
})

const STEP_ORDER: Array<'upload' | 'ocr' | 'ai'> = ['upload', 'ocr', 'ai']
function stepStatus(step: 'upload' | 'ocr' | 'ai') {
  const idx = STEP_ORDER.indexOf(step)
  const curIdx = STEP_ORDER.indexOf(currentStep.value === 'done' ? 'ai' : currentStep.value)
  if (idx < curIdx || currentStep.value === 'done') return 'done'
  if (idx === curIdx) return 'active'
  return 'pending'
}
function stepIcon(step: 'upload' | 'ocr' | 'ai') {
  const s = stepStatus(step)
  if (s === 'done') return '✓'
  if (s === 'active') return '···'
  return ''
}

function startProgressTimers() {
  currentStep.value = 'upload'
  stepTimer = setTimeout(() => {
    currentStep.value = 'ocr'
  }, 500)
  stepTimer = setTimeout(() => {
    currentStep.value = 'ai'
  }, OCR_THRESHOLD_MS + 500)
}

function clearProgressTimers() {
  if (stepTimer) {
    clearTimeout(stepTimer)
    stepTimer = null
  }
}

onUnmounted(clearProgressTimers)

function chooseImage() {
  const choose = (uni as any).chooseMedia || uni.chooseImage
  const opts: any = {
    count: 1,
    sourceType: ['album', 'camera'],
    success: (res: any) => {
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
  if ((uni as any).chooseMedia) opts.mediaType = ['image']
  choose(opts)
}

function readImageAsBase64(tempPath: string) {
  previewUrl.value = tempPath
  imageBase64.value = ''
  reading.value = true

  const compress = (uni as any).compressImage
  const doRead = (pathToRead: string) => {
    const fsm = (uni as any).getFileSystemManager?.()
    if (!fsm) {
      reading.value = false
      uni.showToast({ title: '当前环境不支持读取文件', icon: 'none' })
      return
    }
    const ext = pathToRead.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    const onFail = (err: any) => {
      reading.value = false
      uni.showModal({
        title: '图片读取失败',
        content: `路径: ${pathToRead.slice(0, 60)}...\n错误: ${err?.errMsg || '未知'}`,
        showCancel: false,
      })
    }
    fsm.readFile({
      filePath: pathToRead,
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

  if (compress) {
    compress.call(uni, {
      src: tempPath,
      quality: 60,
      compressedWidth: 1080,
      success: (r: any) => doRead(r.tempFilePath || tempPath),
      fail: () => doRead(tempPath),
    })
  } else {
    doRead(tempPath)
  }
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
  startProgressTimers()

  try {
    const res = await post<{ ocrText: string; analysis: string }>(
      '/report/analyze',
      { image: imageBase64.value },
      { timeout: 180000 },
    )
    clearProgressTimers()
    currentStep.value = 'done'
    uni.setStorageSync('last_report_result', {
      ocrText: res.ocrText,
      analysis: res.analysis,
      ts: Date.now(),
    })
    analyzing.value = false
    uni.navigateTo({ url: '/pages/report/result' })
  } catch (err: any) {
    clearProgressTimers()
    analyzing.value = false
    const msg = err?.message || err?.errMsg || '未知错误'
    uni.showModal({
      title: 'AI 分析失败',
      content: msg.slice(0, 300),
      showCancel: false,
    })
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

.analyze-text {
  font-size: 30rpx;
  color: #FFFDF9;
  font-weight: 600;
  letter-spacing: 1rpx;
}

/* Progress card */
.progress-card {
  margin-top: 40rpx;
  background: #FFFDF9;
  border-radius: 24rpx;
  padding: 36rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(45, 42, 38, 0.04);
}
.progress-header {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}
.spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid #EDE8DF;
  border-top-color: #4A6741;
  border-radius: 50%;
  margin-right: 16rpx;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.progress-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D2A26;
  flex: 1;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.step {
  display: flex;
  align-items: center;
  gap: 16rpx;
  opacity: 0.4;
  transition: opacity 0.3s;
}
.step.active, .step.done { opacity: 1; }
.step-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #EDE8DF;
  color: #8B8680;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step.active .step-icon { background: #4A6741; color: #FFFDF9; }
.step.done .step-icon { background: #4A6741; color: #FFFDF9; }
.step-label {
  font-size: 28rpx;
  color: #2D2A26;
}

.progress-tip {
  font-size: 22rpx;
  color: #B6B1A8;
  display: block;
  text-align: center;
  margin-top: 8rpx;
}
</style>
