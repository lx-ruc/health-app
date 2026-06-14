#!/usr/bin/env node
/**
 * E2E 测试：登录 → 引导录入 → 习惯录入 → 指标打卡 → AI 分析 → 报告上传
 *
 * 运行：node scripts/e2e-test.mjs
 * 前置：后端跑在 127.0.0.1:3000，前端 H5 跑在 localhost:5173
 *
 * 输出：每步的 pass/fail + 截图（/tmp/e2e-shots/）+ 最终汇总
 */
import { createRequire } from 'module'
import path from 'path'
import url from 'url'
import os from 'os'
import fs from 'fs'
import { writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

// Resolve playwright wherever it lives (project-local, global, or nvm-managed)
function loadChromium() {
  const candidates = []
  const projectRoot = path.resolve(__dirname, '..')
  candidates.push(path.join(projectRoot, 'node_modules', 'playwright'))
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    candidates.push(path.join(globalRoot, 'playwright'))
  } catch {}
  const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), '.nvm')
  const vDir = path.join(nvmDir, 'versions', 'node')
  if (fs.existsSync(vDir)) {
    for (const v of fs.readdirSync(vDir)) {
      candidates.push(path.join(vDir, v, 'lib', 'node_modules', 'playwright'))
    }
  }
  const r = createRequire(import.meta.url)
  for (const c of candidates) {
    try {
      return r(c).chromium
    } catch {}
  }
  throw new Error('playwright not found. npm i -g playwright && playwright install chromium')
}

const chromium = loadChromium()

const API = 'http://127.0.0.1:3000/api'
const WEB = 'http://localhost:5173'
const SHOTS = '/tmp/e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const TS = Date.now()
const OPENID = `e2e_${TS}`
const results = []
let stepNum = 0

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

function record(name, passed, detail = '') {
  results.push({ step: ++stepNum, name, passed, detail })
  const tag = passed ? '✓ PASS' : '✗ FAIL'
  console.log(`  ${tag} — ${name}${detail ? ' :: ' + detail : ''}`)
}

async function apiToken() {
  const res = await fetch(`${API}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openid: OPENID }),
  })
  if (!res.ok) throw new Error(`dev-login failed: ${res.status}`)
  const { token } = await res.json()
  return token
}

async function apiGet(token, path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status, data: await res.json().catch(() => null) }
}

async function main() {
  log(`E2E test starting — openid=${OPENID}`)
  const token = await apiToken()

  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone-ish
  })

  // 注入 localStorage：token + profile + onboarding-done，让 H5 直接跳过登录态判断
  await ctx.addInitScript(([t, oid]) => {
    localStorage.setItem('health_token', t)
    localStorage.setItem('health_user_profile', JSON.stringify({
      gender: '男', ageRange: '26-35', heightRange: '170-175cm',
      weightRange: '70-80kg', occupation: '办公室久坐', diseases: ['高血压'],
    }))
    localStorage.setItem('health_metric_config', JSON.stringify(['weight', 'systolic', 'steps']))
    localStorage.setItem('health_guide_done', 'true')
    window.__E2E_OPENID__ = oid
  }, [token, OPENID])

  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`PAGE_ERR: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`)
  })

  // ─────────────────────────────────────────────────────────────
  // Step 1: 登录
  // ─────────────────────────────────────────────────────────────
  log('Step 1: Login (dev-login via API)')
  const { status: loginStatus, data: loginData } = await apiGet(token, '/user/profile')
  record('1.1 登录拿到 JWT', !!token, `token len=${token.length}`)
  record('1.2 JWT 能调通鉴权接口', loginStatus === 200, `GET /user/profile → ${loginStatus}`)

  // ─────────────────────────────────────────────────────────────
  // Step 2: 引导录入（已通过 API 注入 profile，UI 验证）
  // ─────────────────────────────────────────────────────────────
  log('Step 2: Onboarding (profile via API, verify persistence)')
  // PUT profile
  const profileBody = {
    gender: '男', ageRange: '26-35', heightRange: '170-175cm',
    weightRange: '70-80kg', occupation: '办公室久坐', diseases: ['高血压', '颈椎病'],
  }
  const putRes = await fetch(`${API}/user/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(profileBody),
  })
  const { status: getAfter, data: profileAfter } = await apiGet(token, '/user/profile')
  const profileMatch =
    profileAfter?.gender === '男' &&
    profileAfter?.diseases?.includes('颈椎病')
  record('2.1 PUT /user/profile 保存', putRes.status === 200, `HTTP ${putRes.status}`)
  record('2.2 profile 持久化读取一致', profileMatch, `diseases=${JSON.stringify(profileAfter?.diseases)}`)

  // ─────────────────────────────────────────────────────────────
  // Step 3: 习惯录入
  // ─────────────────────────────────────────────────────────────
  log('Step 3: Habit record')
  await page.goto(`${WEB}/#/pages/habit/index`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOTS}/03-habit.png` })

  const TODAY = new Date().toISOString().slice(0, 10)
  const habitBody = {
    date: TODAY, sleepTime: '23:30', wakeTime: '07:00', napDuration: 0,
    workType: '久坐办公', breakfast: '燕麦牛奶', lunch: '鸡胸肉西兰花',
    dinner: '蔬菜沙拉', exerciseType: '快走', exerciseDuration: 30, steps: 7000,
  }
  const habitRes = await fetch(`${API}/habits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(habitBody),
  })
  const { data: habitGet } = await apiGet(token, `/habits?date=${TODAY}`)
  const habitOk = habitGet?.sleep_time === '23:30' && habitGet?.steps === 7000
  record('3.1 POST /habits 保存', habitRes.status === 200, `HTTP ${habitRes.status}`)
  record('3.2 habit 数据回读一致', habitOk, `sleep_time=${habitGet?.sleep_time}, steps=${habitGet?.steps}`)
  record('3.3 习惯页 UI 渲染', await page.title().then((t) => t.length > 0), `title="${await page.title()}"`)

  // ─────────────────────────────────────────────────────────────
  // Step 4: 指标打卡 + 趋势图
  // ─────────────────────────────────────────────────────────────
  log('Step 4: Metric record + trend chart')
  // 先种点历史数据让趋势图有内容
  for (let i = 0; i < 10; i++) {
    const d = new Date(); d.setDate(d.getDate() - i * 2)
    const dateStr = d.toISOString().slice(0, 10)
    await fetch(`${API}/metrics/records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricKey: 'weight', value: 72 - i * 0.3 }),
    })
    // 直接 UPDATE 改 recorded_at（POST 时只能写 now，所以走 raw SQL 之前已经够了，此处略）
  }
  // 跳过精确改时间，趋势图能渲染即可
  await page.goto(`${WEB}/#/pages/metrics/record?metricKey=weight`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/04-metric-trend.png` })

  // 验证趋势图 SVG 存在
  const chartSrc = await page.evaluate(() => {
    const img = document.querySelector('.trend-card img')
    return img?.getAttribute('src') || img?.src || ''
  })
  record('4.1 趋势图 SVG 渲染', chartSrc.includes('svg') && chartSrc.includes('polyline'),
    `src length=${chartSrc.length}, has polyline=${chartSrc.includes('polyline')}`)

  // ─────────────────────────────────────────────────────────────
  // Step 5: AI 分析
  // ─────────────────────────────────────────────────────────────
  log('Step 5: AI analysis chat')
  await page.goto(`${WEB}/#/pages/analysis/index`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOTS}/05-analysis.png` })

  // 调 chat 接口（流式 SSE）
  const chatRes = await fetch(`${API}/analysis/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: '我最近睡眠不好怎么办？' }] }),
  })
  const chatText = await chatRes.text()
  // SSE 把 token 切碎了，需要先抽出每个 data: 行的 content 再拼起来
  const assembled = chatText
    .split('\n')
    .filter((l) => l.startsWith('data: {'))
    .map((l) => {
      try {
        return JSON.parse(l.slice(6)).content || ''
      } catch {
        return ''
      }
    })
    .join('')
  const hasSuggestions = assembled.includes('[[SUGGESTIONS]]')
  const hasContent = chatText.length > 200
  record('5.1 /analysis/chat 流式响应', chatRes.status === 200 && hasContent,
    `status=${chatRes.status}, response bytes=${chatText.length}`)
  record('5.2 AI 返回 [[SUGGESTIONS]] 标记（plan 集成）', hasSuggestions,
    `marker present=${hasSuggestions}, assembled ${assembled.length} chars`)

  // ─────────────────────────────────────────────────────────────
  // Step 6: 报告上传（API 直接测，UI 文件上传难驱动）
  // ─────────────────────────────────────────────────────────────
  log('Step 6: Report upload (API)')
  await page.goto(`${WEB}/#/pages/report/index`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SHOTS}/06-report.png` })

  // 用一个最小合法 PNG（1x1 透明像素）走 OCR，预期 OCR 失败但接口不崩
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const reportRes = await fetch(`${API}/report/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: tinyPng }),
  })
  const reportStatus = reportRes.status
  // 1x1 透明图 OCR 不可识别 → 接口预期 422（OCR failed）或 200（如果 OCR 容忍）
  // 关键是不能 500 崩
  const reportOk = reportStatus === 422 || reportStatus === 200
  record('6.1 /report/analyze 接口不崩', reportOk,
    `HTTP ${reportStatus}（422=OCR 无内容属预期，500=真 bug）`)

  // ─────────────────────────────────────────────────────────────
  // Step 7: 首页整合
  // ─────────────────────────────────────────────────────────────
  log('Step 7: Home integration')
  await page.goto(`${WEB}/#/pages/index/index`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/07-home.png` })
  const homeText = await page.evaluate(() => document.body.innerText)
  const homeOk = homeText.length > 50 && !homeText.includes('undefined')
  record('7.1 首页加载完整', homeOk, `text len=${homeText.length}`)

  // ─────────────────────────────────────────────────────────────
  // 汇总
  // ─────────────────────────────────────────────────────────────
  await browser.close()

  const total = results.length
  const passed = results.filter((r) => r.passed).length
  console.log('\n════════════════════════════════════════')
  console.log(`  E2E 结果：${passed}/${total} 通过`)
  console.log(`  JS 错误数：${errors.length}`)
  errors.slice(0, 5).forEach((e) => console.log('   -', e))
  console.log('════════════════════════════════════════')

  writeFileSync('/tmp/e2e-result.json', JSON.stringify({
    openid: OPENID, ts: TS, total, passed, results, errors,
  }, null, 2))

  process.exit(passed === total && errors.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('E2E failed:', e)
  process.exit(1)
})
