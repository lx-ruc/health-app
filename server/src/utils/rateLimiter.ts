/**
 * 轻量级内存限流器（滑动窗口）。
 *
 * 仅适用于单实例部署。key 由调用方提供（建议包含命名空间 + 用户标识）。
 */

interface RateLimitResult {
  allowed: boolean
  /** 命中限流时，距下一个可用请求的毫秒数（用于 Retry-After 头） */
  retryAfterMs: number
}

interface RateLimitOptions {
  /** 窗口内允许的最大请求数 */
  max: number
  /** 窗口大小（毫秒） */
  windowMs: number
}

const buckets = new Map<string, number[]>()

/**
 * 检查某个 key 是否在窗口内仍可访问。
 * 命中限流返回 allowed:false（不会写入新记录）。
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - opts.windowMs

  const recent = (buckets.get(key) ?? []).filter((t) => t > windowStart)

  if (recent.length >= opts.max) {
    const oldest = recent[0]
    buckets.set(key, recent)
    return { allowed: false, retryAfterMs: oldest + opts.windowMs - now }
  }

  recent.push(now)
  buckets.set(key, recent)
  return { allowed: true, retryAfterMs: 0 }
}
