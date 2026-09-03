<template>
  <canvas
    type="2d"
    :id="canvasId"
    class="trend-canvas"
    :style="{ height: heightRpx + 'rpx' }"
    @touchend="onTouchEnd"
  />
</template>

<script setup lang="ts">
/**
 * 化验单式趋势图（自绘 canvas 2d）：
 * 参考区间横向展开为 shaded zone + 虚线限值、状态色读数点、墨色直线段、无网格线。
 * 几何换算全部来自 utils/chart.ts 纯函数，本组件只做「几何 → canvas 指令」。
 * touchend 反查最近读数 → emit point-tap，读数行由父组件用 HTML 渲染。
 */
import { onMounted, ref, watch, nextTick, getCurrentInstance } from 'vue'
import { scaleFor, fracX, fracY, formatDay } from '../utils/chart'
import type { ChartPoint } from '../utils/chart'
import { metricStatus } from '../utils/metrics'

const props = withDefaults(
  defineProps<{
    points: ChartPoint[]
    metricKey: string
    heightRpx?: number
  }>(),
  { heightRpx: 320 },
)

const emit = defineEmits<{
  (e: 'point-tap', payload: { index: number; point: ChartPoint }): void
}>()

const selectedIndex = ref<number | null>(null)

// setup 同步期捕获实例：watch 回调（异步数据到达）里 getCurrentInstance() 为 null，
// 无作用域的 SelectorQuery 在组件内查不到节点，会导致 canvas 永远空白
const instance = getCurrentInstance()

// canvas id 必须整页唯一：同页出现重复 id 时，后出现的画布会被渲染层直接隐藏
// （官方文档 Bug & Tip #2），即使节点可查询、绘制指令正常执行也永远不可见
const canvasId = `trend-canvas-${props.metricKey}-${instance?.uid ?? 0}`

/* ---- 设计令牌（canvas 无法消费 CSS 变量，取对应字面值） ---- */
const INK_LINE = 'rgba(28, 58, 49, 0.72)' // 连线：墨
const ZONE_FILL = 'rgba(201, 222, 213, 0.42)' // band-zone #C9DED5 展开为 2-D
const ZONE_EDGE = 'rgba(158, 183, 171, 0.9)'
const LABEL_COLOR = '#9DAAA3' // --t3
const DOT_COLORS: Record<string, string> = {
  normal: '#3E8375', // 苔绿
  high: '#B5453C', // 朱砂（仅异常）
  low: '#A96E24', // 琥珀
}

interface Canvas2DNode {
  width: number
  height: number
  getContext(type: '2d'): CanvasRenderingContext2D
}

interface NodeSize {
  canvas: Canvas2DNode
  width: number
  height: number
}

/** 各读数点的画布 x 坐标（tap 反查用；每次重绘时更新） */
let pointXs: number[] = []

onMounted(() => {
  void draw()
})

// 数据变化：清除选中态并重绘；选中态变化：仅重绘
watch(
  () => props.points,
  () => {
    selectedIndex.value = null
    void draw()
  },
)
watch(selectedIndex, () => {
  void draw()
})

async function draw(): Promise<void> {
  if (props.points.length === 0) return
  await nextTick()
  const node = await queryNode()
  if (!node) return
  setupTransform(node)
  try {
    const ctx = node.canvas.getContext('2d')
    render(ctx, node.width, node.height)
  } catch (err) {
    // 错误对象经小程序 console 桥会丢成 {}，用 String() 取 message
    console.error('[TrendChart] render failed:', String(err))
  }
}

function queryNode(): Promise<NodeSize | null> {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(instance?.proxy)
    query
      .select('#' + canvasId)
      .fields({ node: true, size: true } as any, (res: any) => {
        // fields 回调为单结果，exec 回调为数组，两者形态都兼容
        const row = Array.isArray(res) ? res[0] : res
        if (!row?.node || !row.width) {
          console.warn('[TrendChart] canvas 节点未就绪', res)
          return resolve(null)
        }
        resolve({ canvas: row.node as Canvas2DNode, width: row.width, height: row.height })
      })
      .exec()
  })
}

/** dpr 缩放：画布物理像素 = css 像素 × dpr，ctx 变换统一按 css 像素绘制 */
function setupTransform(node: NodeSize): void {
  const dpr = Math.min(uni.getSystemInfoSync().pixelRatio || 2, 3)
  const w = Math.round(node.width * dpr)
  const h = Math.round(node.height * dpr)
  if (node.canvas.width !== w) node.canvas.width = w
  if (node.canvas.height !== h) node.canvas.height = h
  const ctx = node.canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, node.width, node.height)
}

function render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const points = props.points
  const padL = 34
  const padR = 6
  const padT = 8
  const padB = 18
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const scale = scaleFor(props.metricKey, points)
  const tMin = points[0].ts
  const tMax = points[points.length - 1].ts
  const xOf = (ts: number): number => padL + fracX(ts, tMin, tMax) * plotW
  const yOf = (v: number): number => padT + (1 - fracY(v, scale)) * plotH

  // 参考区间 zone + 虚线限值（有区间指标）；无区间画自适应刻度
  if (scale.zone) {
    const yTop = yOf(scale.zone.to)
    const yBottom = yOf(scale.zone.from)
    ctx.fillStyle = ZONE_FILL
    ctx.fillRect(padL, yTop, plotW, yBottom - yTop)
    ctx.strokeStyle = ZONE_EDGE
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    strokeLine(ctx, padL, yTop, padL + plotW, yTop)
    strokeLine(ctx, padL, yBottom, padL + plotW, yBottom)
    ctx.setLineDash([])
    drawLabel(ctx, String(scale.zone.to), padL - 5, yTop, 'left-bottom')
    drawLabel(ctx, String(scale.zone.from), padL - 5, yBottom, 'left-top')
  } else {
    drawLabel(ctx, fmtTick(scale.max), padL - 5, padT, 'left-bottom')
    drawLabel(ctx, fmtTick(scale.min), padL - 5, padT + plotH, 'left-top')
  }

  const xs = points.map((p) => xOf(p.ts))
  const ys = points.map((p) => yOf(p.value))
  pointXs = xs

  // 连线：≥3 点才连（1–2 点只出散点，见空状态分级）
  if (points.length >= 3) {
    ctx.strokeStyle = INK_LINE
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i])))
    ctx.stroke()
  }

  // 读数点：白描边 + 状态色；选中点外加光环
  const radius = points.length > 20 ? 2.2 : 3
  points.forEach((p, i) => {
    const status = metricStatus(props.metricKey, p.value) ?? 'normal'
    if (i === selectedIndex.value) {
      ctx.beginPath()
      ctx.arc(xs[i], ys[i], radius + 3.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = DOT_COLORS[status]
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(xs[i], ys[i], radius, 0, Math.PI * 2)
    ctx.fillStyle = DOT_COLORS[status]
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()
  })

  // x 轴首尾日期
  drawLabel(ctx, formatDay(tMin), padL, height - 5, 'left-top')
  drawLabel(ctx, formatDay(tMax), padL + plotW, height - 5, 'right-top')
}

function onTouchEnd(e: any): void {
  const x = e?.changedTouches?.[0]?.x
  if (typeof x !== 'number' || pointXs.length === 0) return
  let best = 0
  let bestDist = Infinity
  pointXs.forEach((px, i) => {
    const d = Math.abs(px - x)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  selectedIndex.value = best
  emit('point-tap', { index: best, point: props.points[best] })
}

function strokeLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** anchor: 水平对齐-垂直基准，如 "left-bottom" = 左对齐、文字底边贴 y */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  anchor: 'left-top' | 'left-bottom' | 'right-top',
): void {
  ctx.font = '9px "DIN Alternate", "Helvetica Neue", sans-serif'
  ctx.fillStyle = LABEL_COLOR
  ctx.textAlign = anchor.startsWith('right') ? 'right' : 'left'
  ctx.textBaseline = anchor.endsWith('bottom') ? 'bottom' : 'top'
  ctx.fillText(text, x, y)
}

function fmtTick(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
</script>

<style scoped>
.trend-canvas {
  display: block;
  width: 100%;
}
</style>
