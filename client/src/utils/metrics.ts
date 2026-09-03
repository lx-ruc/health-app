/**
 * 指标参考区间：化验单语义的客户端工具。
 * 仅有临床意义的预设指标配置参考范围；体重/步数等个人趋势类与自定义指标不设区间。
 */

export type MetricStatus = 'low' | 'normal' | 'high'

export interface ReferenceRange {
  /** 正常区间 */
  min: number
  max: number
  /** 区间带整体刻度（含偏离余量），用于计算落点百分比 */
  scaleMin: number
  scaleMax: number
}

const RANGES: Record<string, ReferenceRange> = {
  systolic:           { min: 90,  max: 140, scaleMin: 60, scaleMax: 190 },
  diastolic:          { min: 60,  max: 90,  scaleMin: 40, scaleMax: 120 },
  fastingGlucose:     { min: 3.9, max: 6.1, scaleMin: 2.5, scaleMax: 10 },
  postprandialGlucose:{ min: 3.9, max: 7.8, scaleMin: 2.5, scaleMax: 13 },
  heartRate:          { min: 60,  max: 100, scaleMin: 40, scaleMax: 130 },
}

/** 是否有参考区间（决定是否渲染区间带） */
export function hasReference(metricKey: string): boolean {
  return metricKey in RANGES
}

/** 预设指标的参考区间配置；无则返回 null（供图表几何层复用刻度） */
export function getRange(metricKey: string): ReferenceRange | null {
  return RANGES[metricKey] ?? null
}

/** 参考区间文本，如 "90–140"；无区间返回 null */
export function referenceText(metricKey: string): string | null {
  const r = RANGES[metricKey]
  return r ? `${r.min}–${r.max}` : null
}

/** 判定读数状态；无区间或未填返回 null */
export function metricStatus(metricKey: string, value: number | null | undefined): MetricStatus | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const r = RANGES[metricKey]
  if (!r) return null
  if (value < r.min) return 'low'
  if (value > r.max) return 'high'
  return 'normal'
}

export interface BandGeometry {
  /** 正常区间在带上的起点/宽度（百分比） */
  zoneLeft: number
  zoneWidth: number
  /** 读数落点（百分比，已夹在 4%–96%） */
  dotLeft: number
}

/** 计算区间带几何：正常带位置 + 读数落点 */
export function bandGeometry(metricKey: string, value: number | null | undefined): BandGeometry {
  const r = RANGES[metricKey]
  if (!r) return { zoneLeft: 0, zoneWidth: 0, dotLeft: 50 }

  const span = r.scaleMax - r.scaleMin
  const pct = (v: number) => ((v - r.scaleMin) / span) * 100

  let dotLeft = 50
  if (value !== null && value !== undefined && !Number.isNaN(value)) {
    dotLeft = Math.min(96, Math.max(4, pct(value)))
  }

  return {
    zoneLeft: pct(r.min),
    zoneWidth: pct(r.max) - pct(r.min),
    dotLeft,
  }
}

/** 状态中文签：偏低 / 正常 / 偏高 */
export function statusLabel(status: MetricStatus | null): string {
  if (status === 'low') return '偏低'
  if (status === 'high') return '偏高'
  if (status === 'normal') return '正常'
  return ''
}

/** 化验单箭头：↑ ↓ */
export function statusArrow(status: MetricStatus | null): string {
  if (status === 'low') return '↓'
  if (status === 'high') return '↑'
  return ''
}
