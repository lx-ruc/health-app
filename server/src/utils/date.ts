/**
 * 日期工具：统一使用东八区（Asia/Shanghai）日期，避免 UTC 偏差。
 *
 * 之前使用 new Date().toISOString().slice(0,10) 得到的是 UTC 日期，
 * 中国用户在凌晨 0:00-8:00 记录时会被记成前一天。
 * 中国无夏令时，固定 UTC+8，因此用固定偏移即可。
 */

const CHINA_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

/** 返回指定时间在东八区的 YYYY-MM-DD 日期串 */
export function toChinaDateStr(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + CHINA_TZ_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** 返回 n 天前在东八区的 YYYY-MM-DD 日期串 */
export function toChinaDateStrDaysAgo(days: number, base: Date = new Date()): string {
  return toChinaDateStr(new Date(base.getTime() - days * 24 * 60 * 60 * 1000))
}
