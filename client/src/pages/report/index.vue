<template>
  <view class="report-page">
    <view class="upload-area" @tap="chooseImage">
      <view v-if="images.length === 0" class="upload-placeholder">
        <view class="upload-icon-wrap">
          <image class="icon-svg-lg" :src="getIcon('camera', '#8B8680')" mode="aspectFit" />
        </view>
        <text class="upload-text">上传体检报告</text>
        <text class="upload-hint">可多选，拍照或从相册</text>
      </view>
      <view v-else class="thumb-list">
        <view v-for="(img, idx) in images" :key="idx" class="thumb-item">
          <image :src="img.previewUrl" mode="aspectFill" class="thumb-img" />
          <view v-if="!analyzing" class="thumb-remove" @tap.stop="removeImage(idx)">
            <text class="thumb-remove-x">×</text>
          </view>
          <view class="thumb-idx"><text class="thumb-idx-text">{{ idx + 1 }}</text></view>
        </view>
        <view v-if="!analyzing && images.length < 9" class="thumb-add" @tap.stop="chooseImage">
          <text class="thumb-add-text">+</text>
        </view>
      </view>
    </view>

    <view v-if="images.length > 0 && !analyzing" class="analyze-area">
      <view class="analyze-btn" @tap="analyze">
        <text class="analyze-text">开始 AI 分析（{{ images.length }} 张）</text>
      </view>
    </view>

    <view v-if="analyzing" class="progress-card">
      <view class="progress-header">
        <view class="spinner" />
        <text class="progress-title">{{ progressTitle }}</text>
        <text class="progress-elapsed">已用 {{ elapsedSec }}s</text>
      </view>
      <view class="steps">
        <view class="step" :class="stepStatus('upload')">
          <text class="step-icon">{{ stepIcon('upload') }}</text>
          <text class="step-label">上传图片</text>
        </view>
        <view class="step" :class="stepStatus('ocr')">
          <text class="step-icon">{{ stepIcon('ocr') }}</text>
          <text class="step-label">OCR 识别 {{ ocrProgress }}</text>
        </view>
        <view class="step" :class="stepStatus('ai')">
          <text class="step-icon">{{ stepIcon('ai') }}</text>
          <text class="step-label">AI 分析</text>
        </view>
      </view>

      <view v-if="ocrPreview" class="block ocr-block">
        <text class="block-title">OCR 识别结果（{{ ocrDoneCount }}/{{ images.length }}）</text>
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

interface ReportImage {
  previewUrl: string
  base64: string
}

const images = ref<ReportImage[]>([])
const analyzing = ref(false)
const reading = ref(false)
const currentStep = ref<'upload' | 'ocr' | 'ai' | 'done'>('upload')
const ocrPreview = ref('')
const ocrDoneCount = ref(0)
const aiStreamText = ref('')
const elapsedSec = ref(0)
let elapsedTimer: any = null

const ocrProgress = computed(() =>
  images.value.length > 1 ? `(${ocrDoneCount.value}/${images.value.length})` : '',
)

const progressTitle = computed(() => {
  switch (currentStep.value) {
    case 'upload': return '上传中...'
    case 'ocr': return `正在识别文字内容...（PaddleOCR${ocrProgress.value}）`
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

function startElapsedTimer() {
  elapsedSec.value = 0
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = setInterval(() => { elapsedSec.value += 1 }, 1000)
}
function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

onUnmounted(() => {
  stopElapsedTimer()
  analyzing.value = false
})

function chooseImage() {
  if (analyzing.value) return
  const choose = (uni as any).chooseMedia || uni.chooseImage
  const remaining = 9 - images.value.length
  const opts: any = {
    count: Math.max(1, remaining),
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      const items: any[] = []
      if (res.tempFiles) {
        for (const f of res.tempFiles) items.push(f.tempFilePath || f.path)
      } else if (res.tempFilePaths) {
        for (const p of res.tempFilePaths) items.push(p)
      }
      if (items.length === 0) {
        uni.showToast({ title: '选图失败：未拿到路径', icon: 'none' })
        return
      }
      // 串行读取每张图（mp-weixin 同时 readFile 多张不稳）
      ;(async () => {
        reading.value = true
        uni.showLoading({ title: `读取图片 0/${items.length}`, mask: true })
        for (let i = 0; i < items.length; i++) {
          uni.showLoading({ title: `读取图片 ${i + 1}/${items.length}`, mask: true })
          try {
            const b64 = await readImageAsBase64Async(items[i])
            images.value.push({ previewUrl: items[i], base64: b64 })
          } catch (e: any) {
            uni.showToast({ title: `第 ${i + 1} 张读取失败`, icon: 'none' })
          }
        }
        uni.hideLoading()
        reading.value = false
      })()
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

function readImageAsBase64Async(tempPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const compress = (uni as any).compressImage
    const doRead = (pathToRead: string) => {
      const fsm = (uni as any).getFileSystemManager?.()
      if (!fsm) { reject(new Error('环境不支持')); return }
      const ext = pathToRead.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
      fsm.readFile({
        filePath: pathToRead,
        encoding: 'base64',
        success: (fileRes: any) => {
          if (!fileRes.data || fileRes.data.length < 100) {
            reject(new Error('数据为空'))
            return
          }
          resolve(`data:${ext};base64,${fileRes.data}`)
        },
        fail: (err: any) => reject(err),
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
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

async function analyze() {
  if (reading.value) {
    uni.showToast({ title: '图片读取中，请稍候', icon: 'none' })
    return
  }
  if (images.value.length === 0) {
    uni.showToast({ title: '请先选择图片', icon: 'none' })
    return
  }
  analyzing.value = true
  currentStep.value = 'upload'
  ocrPreview.value = ''
  ocrDoneCount.value = 0
  aiStreamText.value = ''
  startElapsedTimer()

  try {
    // 第 1 步：逐张 OCR（普通 POST），结果拼接
    currentStep.value = 'ocr'
    const allTexts: string[] = []
    for (let i = 0; i < images.value.length; i++) {
      const { ocrText } = await post<{ ocrText: string }>(
        '/report/ocr',
        { image: images.value[i].base64 },
        { timeout: 60000 },
      )
      allTexts.push(ocrText)
      ocrDoneCount.value = i + 1
      ocrPreview.value = allTexts.map((t, idx) => `— 第 ${idx + 1} 张 —\n${t}`).join('\n\n')
    }
    const combinedOcr = allTexts.join('\n\n')
    currentStep.value = 'ai'

    // 第 2 步：AI 流式（SSE）
    const analysis = await streamAnalyzeAi(combinedOcr)

    stopElapsedTimer()
    uni.setStorageSync('last_report_result', {
      ocrText: combinedOcr,
      analysis,
      ts: Date.now(),
    })
    analyzing.value = false
    uni.navigateTo({ url: '/pages/report/result' })
  } catch (err: any) {
    stopElapsedTimer()
    analyzing.value = false
    const msg = err?.message || err?.errMsg || '未知错误'
    uni.showModal({
      title: 'AI 分析失败',
      content: msg.slice(0, 300),
      showCancel: false,
    })
  }
}

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
        if (data.step === 'ai_start') currentStep.value = 'ai'
        else if (data.step === 'ai_token') aiStreamText.value = data.content || ''
        else if (data.step === 'ai_done') {
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
        if (!analysis && res?.data) {
          let raw: string
          if (res.data instanceof ArrayBuffer) raw = arrayBufferToUtf8(res.data)
          else if (typeof res.data === 'string') raw = res.data
          else raw = JSON.stringify(res.data)
          for (const line of raw.split('\n')) processLine(line)
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
  padding: 20rpx;
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

.thumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  width: 100%;
  justify-content: flex-start;
}
.thumb-item {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  background: #F5F0E8;
}
.thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-remove-x {
  color: #fff;
  font-size: 32rpx;
  line-height: 32rpx;
}
.thumb-idx {
  position: absolute;
  bottom: 6rpx;
  left: 6rpx;
  background: rgba(74, 103, 65, 0.9);
  border-radius: 12rpx;
  padding: 2rpx 10rpx;
}
.thumb-idx-text {
  color: #fff;
  font-size: 22rpx;
}
.thumb-add {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  border: 2rpx dashed #D4CFC7;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FAF7F2;
}
.thumb-add-text {
  font-size: 60rpx;
  color: #B8B3AC;
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
.progress-elapsed {
  font-size: 24rpx;
  color: #8B8680;
  font-weight: 400;
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
