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
          <text class="step-label">AI 分析</text>
        </view>
      </view>

      <view v-if="ocrPreview" class="block ocr-block">
        <text class="block-title">OCR 识别结果</text>
        <text class="block-text">{{ ocrPreview }}</text>
      </view>

      <view v-if="aiStreamText" class="block ai-block">
        <text class="block-title">AI 分析（流式输出）</text>
        <text class="block-text">{{ aiStreamText }}{{ currentStep === 'ai' ? '▌' : '' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { post } from '../../api'
import { getIcon } from '../../utils/icons'
import { getToken } from '../../utils/storage'
import { API_BASE } from '../../utils/constants'

const previewUrl = ref('')
const imageBase64 = ref('')
const analyzing = ref(false)
const reading = ref(false)
const currentStep = ref<'upload' | 'ocr' | 'ai' | 'done'>('upload')
const ocrPreview = ref('')
const aiStreamText = ref('')

const progressTitle = computed(() => {
  switch (currentStep.value) {
    case 'upload': return '上传中...'
    case 'ocr': return '正在识别文字内容...（PaddleOCR）'
    case 'ai': return '正在分析异常指标...（DeepSeek 流式）'
    case 'done': return '完成'
    default: return ''
  }
})

const STEP_ORDER: Array<'upload' | 'ocr' | 'ai'> = ['upload', 'ocr', 'ai']
function stepStatus(step: 'upload' | 'ocr' | 'ai') {
  const idx = STEP_ORDER.indexOf(step)
  const curStep = currentStep.value === 'done' ? 'ai' : currentStep.value
  const curIdx = STEP_ORDER.indexOf(curStep as any)
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

onUnmounted(() => {
  analyzing.value = false
})

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
  currentStep.value = 'upload'
  ocrPreview.value = ''
  aiStreamText.value = ''

  try {
    // 第 1 步：OCR（普通 POST，大 body 用全局 post 享受 401 自动重试）
    currentStep.value = 'ocr'
    const { ocrText } = await post<{ ocrText: string }>(
      '/report/ocr',
      { image: imageBase64.value },
      { timeout: 60000 },
    )
    ocrPreview.value = ocrText
    currentStep.value = 'ai'

    // 第 2 步：AI 流式（SSE，小 body）
    const analysis = await streamAnalyzeAi(ocrText)

    uni.setStorageSync('last_report_result', { ocrText, analysis, ts: Date.now() })
    analyzing.value = false
    uni.navigateTo({ url: '/pages/report/result' })
  } catch (err: any) {
    analyzing.value = false
    const msg = err?.message || err?.errMsg || '未知错误'
    uni.showModal({
      title: 'AI 分析失败',
      content: msg.slice(0, 300),
      showCancel: false,
    })
  }
}

/** SSE 流式调 AI 分析。小 body，照搬 chat.ts 模式（enableChunked + arraybuffer） */
function streamAnalyzeAi(ocrText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let analysis = ''
    let lineBuffer = ''
    let errored = false

    const processLine = (rawLine: string) => {
      const trimmed = rawLine.trim()
      if (!trimmed.startsWith('data:')) return
      const payload = trimmed.slice(5).trim()
      if (!payload) return
      try {
        const data = JSON.parse(payload)
        if (data.step === 'ai_start') {
          currentStep.value = 'ai'
        } else if (data.step === 'ai_token') {
          aiStreamText.value = data.content || ''
        } else if (data.step === 'ai_done') {
          analysis = data.analysis || ''
          aiStreamText.value = analysis
        } else if (data.step === 'done') {
          analysis = data.analysis || analysis
          currentStep.value = 'done'
        } else if (data.step === 'error') {
          errored = true
          reject(new Error(data.error + (data.detail ? `（${data.detail}）` : '')))
        }
      } catch {}
    }

    const task: any = uni.request({
      url: `${API_BASE}/report/analyze-stream`,
      method: 'POST' as any,
      data: { ocrText },
      timeout: 180000,
      enableChunked: true,
      responseType: 'arraybuffer' as any,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      success: (res: any) => {
        if (errored) return
        if (lineBuffer.trim()) {
          processLine(lineBuffer)
          lineBuffer = ''
        }
        // 兜底：onChunkReceived 没触发时，从 res.data 解
        if (!analysis && res?.data) {
          let raw: string
          if (res.data instanceof ArrayBuffer) raw = arrayBufferToUtf8(res.data)
          else if (typeof res.data === 'string') raw = res.data
          else raw = JSON.stringify(res.data)
          const lines = raw.split('\n')
          for (const line of lines) processLine(line)
        }
        if (!analysis) {
          reject(new Error(`AI 分析未返回内容（statusCode=${res?.statusCode}）`))
          return
        }
        resolve(analysis)
      },
      fail: (err: any) => reject(err),
    })

    task.onChunkReceived?.((res: any) => {
      if (!res?.data || errored) return
      lineBuffer += arrayBufferToUtf8(res.data as ArrayBuffer)
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''
      for (const line of lines) processLine(line)
    })
  })
}

function arrayBufferToUtf8(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const b1 = bytes[i++]
    if (b1 < 0x80) {
      result += String.fromCharCode(b1)
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++]
      result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++]
      const b3 = bytes[i++]
      result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
    } else {
      const b2 = bytes[i++]
      const b3 = bytes[i++]
      const b4 = bytes[i++]
      const cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)
      const off = cp - 0x10000
      result += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff))
    }
  }
  return result
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
  margin-bottom: 28rpx;
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

.block {
  background: #FAF7F2;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-top: 16rpx;
}
.ai-block {
  background: rgba(74, 103, 65, 0.06);
}
.block-title {
  font-size: 22rpx;
  color: #8B8680;
  display: block;
  margin-bottom: 8rpx;
}
.block-text {
  font-size: 24rpx;
  color: #5A5650;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
