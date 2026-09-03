// 注意：开发环境用 127.0.0.1 而非 localhost——
// 新版开发者工具网络层把 localhost 解析为 IPv6 ::1 且不回退 IPv4，
// 而本地服务只监听 IPv4，会瞬时连接拒绝（Failed to fetch）。
export const API_BASE = 'http://127.0.0.1:3000/api'

export const GENDER_OPTIONS = ['男', '女'] as const

export const AGE_OPTIONS = ['18-25', '26-35', '36-45', '46-55', '55+'] as const

export const OCCUPATION_OPTIONS = [
  '办公室久坐',
  '户外工作',
  '体力劳动',
  '学生',
  '自由职业',
  '其他',
] as const

export const DISEASE_OPTIONS = [
  '无',
  '高血压',
  '高血脂',
  '糖尿病',
  '高尿酸',
  '脂肪肝',
  '心脏病',
  '胃病',
  '颈椎病',
  '其他',
] as const

export const ALLERGY_OPTIONS = [
  '无',
  '海鲜',
  '花粉',
  '尘螨',
  '药物',
  '牛奶',
  '鸡蛋',
  '坚果',
  '宠物毛屑',
  '其他',
] as const

export const SURGERY_OPTIONS = [
  '无',
  '阑尾切除',
  '胆囊切除',
  '扁桃体切除',
  '骨折手术',
  '剖腹产',
  '甲状腺手术',
  '其他',
] as const

export interface MetricItem {
  key: string
  label: string
  unit: string
}

export const METRIC_OPTIONS: ReadonlyArray<MetricItem> = [
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'systolic', label: '收缩压', unit: 'mmHg' },
  { key: 'diastolic', label: '舒张压', unit: 'mmHg' },
  { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L' },
  { key: 'postprandialGlucose', label: '餐后血糖', unit: 'mmol/L' },
  { key: 'steps', label: '每日步数', unit: '步' },
  { key: 'exerciseDuration', label: '运动时长', unit: '分钟' },
  { key: 'heartRate', label: '心率', unit: '次/分' },
]

/** 预设指标 key 集合，用于区分自定义指标 */
export const PRESET_METRIC_KEYS: ReadonlySet<string> = new Set(METRIC_OPTIONS.map((m) => m.key))

export const WORK_TYPE_OPTIONS = [
  '久坐办公',
  '户外工作',
  '体力劳动',
  '混合',
] as const
