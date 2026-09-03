/**
 * 趋势图几何纯函数：化验单式图表的坐标换算层。
 * 输出一律为数值/百分比，不触 UI、不触 canvas；
 * TrendChart.vue（canvas 像素）与首页 sparkline（CSS 百分比）共用同一套换算。
 */
import { getRange, metricStatus } from './metrics'
import type { MetricStatus } from './metrics'

export interface ChartPoint {
  /** 读数时间（ms，UTC 时间戳） */
  ts: number
  value: number
}

export interface YScale {
  min: number
  max: number
  /** 参考区间（正常带）在值域上的投影；无区间指标为 null */
  zone: { from: number; to: number } | null
}

/** 服务端返回的指标记录行（uni.request 反序列化后的结构子集） */
export interface MetricRecordRow {
  metric_key?: string
  recorded_at?: string
  value?: number
}

const DAY_MS = 24 * 3600 * 1000

/** recorded_at（"YYYY-MM-DD HH:MM:SS"，UTC）→ 时间戳 */
export function toTs(recordedAt: string): number {
  return new Date(`${recordedAt.replace(' ', 'T')}Z`).getTime()
}

/** 记录列表（服务端 DESC）→ 指定指标的升序 ChartPoint 列表 */
export function toPoints(records: MetricRecordRow[], metricKey: string): ChartPoint[] {
  return records
    .filter((r) => r.metric_key === metricKey && r.recorded_at && typeof r.value === 'number')
    .map((r) => ({ ts: toTs(r.recorded_at as string), value: r.value as number }))
    .sort((a, b) => a.ts - b.ts)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * y 轴刻度：有参考区间沿用 RANGES 的固定刻度（scaleMin/scaleMax）；
 * 无区间指标按数据 min/max 外扩 10% 自适应（单点/等值时外扩绝对值的 10%）。
 */
export function scaleFor(metricKey: string, points: ChartPoint[]): YScale {
  const range = getRange(metricKey)
  if (range) {
    return { min: range.scaleMin, max: range.scaleMax, zone: { from: range.min, to: range.max } }
  }
  if (points.length === 0) return { min: 0, max: 1, zone: null }

  const values = points.map((p) => p.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (lo === hi) {
    const pad = Math.max(Math.abs(lo) * 0.1, 1)
    lo -= pad
    hi += pad
  } else {
    const pad = (hi - lo) * 0.1
    lo -= pad
    hi += pad
  }
  return { min: lo, max: hi, zone: null }
}

/** 取「最近 N 天」切片：以最新读数为锚向前数 N 天（输入需升序） */
export function windowSlice(points: ChartPoint[], days: number): ChartPoint[] {
  if (points.length === 0) return []
  const cutoff = points[points.length - 1].ts - (days - 1) * DAY_MS
  return points.filter((p) => p.ts >= cutoff)
}

/** 窗口统计：最高/最低/平均（原始值，格式化由展示层负责）；空输入返回全 0 */
export function stats(points: ChartPoint[]): { max: number; min: number; avg: number } {
  if (points.length === 0) return { max: 0, min: 0, avg: 0 }
  const values = points.map((p) => p.value)
  const sum = values.reduce((s, v) => s + v, 0)
  return { max: Math.max(...values), min: Math.min(...values), avg: sum / values.length }
}

/** 值 → y 轴底部起算的比例（0=底 1=顶），越界夹在 [0,1] */
export function fracY(value: number, scale: YScale): number {
  if (scale.max === scale.min) return 0.5
  return clamp((value - scale.min) / (scale.max - scale.min), 0, 1)
}

/** 时间 → x 轴左端起算的比例（0=左 1=右）；退化区间时居中 */
export function fracX(ts: number, tMin: number, tMax: number): number {
  if (tMax === tMin) return 0.5
  return clamp((ts - tMin) / (tMax - tMin), 0, 1)
}

/** UTC 日键 "YYYY-MM-DD"（与 recorded_at 存储口径一致） */
function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

/** 读数日期短格式 "M/D"（UTC 口径） */
export function formatDay(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export interface SparkDot {
  /** 相对容器 left 百分比，如 "37%" */
  left: string
  /** 相对容器 top 百分比（夹在 6–94 保证可见） */
  top: string
  status: MetricStatus | null
}

/**
 * 首页 CSS 点阵：按日聚合取当日最新一条（输入需升序），
 * 输出绝对定位百分比，供零 canvas 的 view 圆点直接消费。
 */
export function sparklineDots(points: ChartPoint[], metricKey: string, days = 14): SparkDot[] {
  if (points.length === 0) return []

  const latestByDay = new Map<string, ChartPoint>()
  for (const p of points) {
    latestByDay.set(dayKey(p.ts), p)
  }

  const scale = scaleFor(metricKey, points)
  const newestDay = dayKey(points[points.length - 1].ts)
  const newestDayTs = Date.parse(`${newestDay}T00:00:00Z`)

  const dots: Array<{ diffDays: number; dot: SparkDot }> = []
  for (const [key, p] of latestByDay) {
    const dayTs = Date.parse(`${key}T00:00:00Z`)
    const diffDays = Math.round((newestDayTs - dayTs) / DAY_MS)
    if (diffDays < 0 || diffDays > days - 1) continue
    const leftPct = ((days - 1 - diffDays) / (days - 1)) * 100
    const topPct = 100 - clamp(fracY(p.value, scale) * 100, 6, 94)
    dots.push({
      diffDays,
      dot: {
        left: `${leftPct.toFixed(1)}%`,
        top: `${topPct.toFixed(1)}%`,
        status: metricStatus(metricKey, p.value),
      },
    })
  }
  // 由远及近（左→右）的确定性顺序
  return dots.sort((a, b) => b.diffDays - a.diffDays).map((d) => d.dot)
}
