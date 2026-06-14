<template>
  <view class="trend-chart">
    <view v-if="points.length === 0" class="empty">
      <text class="empty-text">暂无记录，开始打卡查看趋势</text>
    </view>
    <image
      v-else
      class="chart-image"
      :src="dataUrl"
      mode="scaleToFill"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Point {
  date: string
  value: number
}

const props = withDefaults(
  defineProps<{
    points: Point[]
    color?: string
  }>(),
  { color: '#4A6741' },
)

const dataUrl = computed(() => {
  const svg = buildSvg(props.points, props.color)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})

interface PlotBox {
  xOf: (i: number) => number
  yOf: (v: number) => number
  min: number
  max: number
}

const W = 600
const H = 280
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 28

function makeScale(points: Point[]): PlotBox {
  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  let pad = (max - min) * 0.1
  if (pad === 0) pad = Math.max(1, Math.abs(min) * 0.1)
  min -= pad
  max += pad
  const range = max - min || 1
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const xOf = (i: number) =>
    points.length === 1 ? PAD_L + plotW / 2 : PAD_L + (i / (points.length - 1)) * plotW
  const yOf = (v: number) => PAD_T + plotH - ((v - min) / range) * plotH
  return { xOf, yOf, min, max }
}

function fmtVal(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

function fmtDate(s: string): string {
  const d = s.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[1]}/${parts[2]}`
}

function buildSvg(points: Point[], color: string): string {
  const { xOf, yOf, min, max } = makeScale(points)
  const mid = (max + min) / 2
  const yLines = [max, mid, min]
  const plotRight = W - PAD_R

  const gridXml = yLines
    .map(
      (v) =>
        `<line x1="${PAD_L}" y1="${yOf(v).toFixed(1)}" x2="${plotRight}" y2="${yOf(v).toFixed(1)}" stroke="#EDE8DF" stroke-width="1" stroke-dasharray="4 4"/>`,
    )
    .join('')

  const yLabelXml = yLines
    .map(
      (v) =>
        `<text x="${PAD_L - 6}" y="${(yOf(v) + 4).toFixed(1)}" font-size="13" fill="#8B8680" text-anchor="end" font-family="system-ui, -apple-system, sans-serif">${fmtVal(v)}</text>`,
    )
    .join('')

  const polyPts = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(' ')

  const dotsXml = points
    .map(
      (p, i) =>
        `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(p.value).toFixed(1)}" r="3" fill="${color}"/>`,
    )
    .join('')

  const xLabels: string[] = []
  const labelY = H - 8
  const pushLabel = (i: number) => {
    xLabels.push(
      `<text x="${xOf(i).toFixed(1)}" y="${labelY}" font-size="13" fill="#8B8680" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${fmtDate(points[i].date)}</text>`,
    )
  }
  if (points.length > 0) pushLabel(0)
  if (points.length > 2) pushLabel(Math.floor((points.length - 1) / 2))
  if (points.length > 1) pushLabel(points.length - 1)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
${gridXml}
<polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
${dotsXml}
${yLabelXml}
${xLabels.join('')}
</svg>`
}
</script>

<style scoped>
.trend-chart {
  width: 100%;
}
.chart-image {
  width: 100%;
  height: 320rpx;
  display: block;
}
.empty {
  height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-text {
  font-size: 26rpx;
  color: #8b8680;
}
</style>
