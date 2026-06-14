## Why

很多人的生活习惯（熬夜、久坐、饮食不规律）会引发慢性疾病（高血压、高血脂、高尿酸等），但用户往往不自知，直到体检才发现指标异常。需要一个工具帮助用户记录日常习惯、追踪健康指标，并通过 AI 分析习惯与疾病之间的关联，给出可执行的建议。

## What Changes

- 新建 uni-app (Vue 3 + TypeScript) 前端项目，包含首页、习惯录入、指标打卡、AI 对话、个人资料等页面
- 新建 Node (Fastify) 后端项目，提供 RESTful API，代理 AI 服务调用
- 实现微信小程序静默登录（wx.login → 后端换 JWT），用户无感知
- 实现渐进式引导流程，首次进入时通过多步选择题收集用户基本信息
- 实现每日生活习惯录入（睡眠、起床、饮食、运动、久坐、午休）
- 实现用户可选的指标打卡功能（体重、血压、血糖、步数、运动时长等）
- 实现 AI 对话分析功能，通过 DeepSeek 分析用户习惯与疾病的关联并给出建议
- 实现体检报告 OCR 上传功能，通过 SiliconFlow PaddleOCR-VL 识别异常指标

## Capabilities

### New Capabilities

- `user-profile`: 用户基本信息管理 — 渐进式引导录入（年龄、身高、体重、性别、职业、病史），全选择题，支持后续修改
- `habit-logging`: 每日生活习惯记录 — 睡眠/起床时间、饮食搭配、运动、久坐时长、午休等结构化录入
- `metric-tracking`: 健康指标打卡 — 用户可选指标（体重/血压/血糖/步数/运动时长），记录历史数据
- `ai-analysis`: AI 对话分析 — 无状态模式，拼接用户画像+对话历史，DeepSeek 分析习惯与疾病关联，支持多轮对话追问
- `medical-report-ocr`: 体检报告识别 — 上传 PDF/照片，SiliconFlow OCR 提取文字，AI 分析异常指标
- `auth`: 用户认证 — 微信小程序静默登录，后端签发 JWT，前端自动续期

### Modified Capabilities

（无，全新项目）

## Impact

- **新增仓库**: `health-app` GitHub 仓库
- **前端**: uni-app (Vue 3 + TS + Pinia)，微信小程序端
- **后端**: Node.js + Fastify，RESTful API
- **数据库**: SQLite（轻量单文件，第一版够用）
- **外部 API 依赖**: DeepSeek API（AI 分析）、SiliconFlow API（OCR）
- **微信平台**: 需要注册小程序获取 AppID
