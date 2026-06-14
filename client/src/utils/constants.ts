// API 基础地址：
// - H5 dev: localhost 可达
// - mp-weixin 沙箱访问不到 dev 机器的 127.0.0.1，必须用 LAN IP
// - 真机/生产：改成 HTTPS 域名 + 在 mp.weixin.qq.com 后台配 request 合法域名
// #ifdef H5
const API_HOST = 'http://localhost:3000'
// #endif
// #ifndef H5
const API_HOST = 'http://192.168.31.33:3000'
// #endif
export const API_BASE = `${API_HOST}/api`

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
