// 用 127.0.0.1 而不是 localhost：部分 mp-weixin 版本对 localhost 有特殊校验
// 真机部署时改成 HTTPS 域名
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

export const METRIC_OPTIONS = [
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'systolic', label: '收缩压', unit: 'mmHg' },
  { key: 'diastolic', label: '舒张压', unit: 'mmHg' },
  { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L' },
  { key: 'postprandialGlucose', label: '餐后血糖', unit: 'mmol/L' },
  { key: 'steps', label: '每日步数', unit: '步' },
  { key: 'exerciseDuration', label: '运动时长', unit: '分钟' },
  { key: 'heartRate', label: '心率', unit: '次/分' },
] as const

export const WORK_TYPE_OPTIONS = [
  '久坐办公',
  '户外工作',
  '体力劳动',
  '混合',
] as const
