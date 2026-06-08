## 1. 项目初始化

- [x] 1.1 初始化 uni-app 前端项目（Vue 3 + TS + Pinia），配置 manifest.json、pages.json、基础目录结构
- [x] 1.2 初始化 Node 后端项目（Fastify + TypeScript），配置 tsconfig、package.json、基础目录结构
- [x] 1.3 配置后端 ESLint + Prettier，前端使用 uni-app 内置规范
- [x] 1.4 后端安装 better-sqlite3，创建数据库初始化脚本（users、habits、metrics、reports、conversations 表）

## 2. 认证模块

- [x] 2.1 后端实现 `/api/auth/login` 接口：接收 wx.login code，调用微信 API 换 openid，签发 JWT
- [x] 2.2 后端实现 JWT 中间件：验证 token，注入 openid 到请求上下文
- [x] 2.3 后端实现 `/api/auth/refresh` 接口：JWT 续期
- [x] 2.4 前端封装 API 请求模块：自动携带 Authorization header，401 时自动重新登录
- [x] 2.5 前端实现 App.vue 启动逻辑：自动调用 wx.login → 后端换 token → 判断是否首次进入

## 3. 用户资料模块

- [x] 3.1 后端实现 `/api/user/profile` GET/PUT 接口：读取和更新用户资料
- [x] 3.2 前端实现 Pinia userStore：管理用户资料状态，StorageSync 持久化
- [x] 3.3 前端实现引导录入页面（onboarding/index）：多步选择题表单，支持断点续填
- [x] 3.4 前端实现个人资料修改页面（profile/index）：加载已有数据，编辑保存

## 4. 习惯录入模块

- [x] 4.1 后端实现 `/api/habits` GET/POST/PUT 接口：按日期查询、新增、更新习惯记录
- [x] 4.2 前端实现 Pinia habitStore：管理每日习惯数据，StorageSync 缓存
- [x] 4.3 前端实现习惯录入页面（habit/index）：睡眠、起床、午休、工作类型、三餐、运动、步数字段
- [x] 4.4 前端实现历史记录页面（history/index）：按日期倒序展示 30 天习惯记录

## 5. 指标打卡模块

- [x] 5.1 后端实现 `/api/metrics/config` GET/PUT 接口：管理用户选择的指标列表
- [x] 5.2 后端实现 `/api/metrics/records` GET/POST 接口：查询和录入指标数值
- [x] 5.3 前端实现 Pinia metricStore：管理指标配置和打卡数据
- [x] 5.4 前端实现指标打卡列表页（metrics/index）：展示已选指标，快捷录入入口
- [x] 5.5 前端实现指标录入页面（metrics/record）：数值输入，保存打卡
- [ ] 5.6 前端实现指标趋势图：使用 uCharts 或 uCharts-lite 绘制折线图

## 6. AI 对话分析模块

- [x] 6.1 后端封装 DeepSeek API 调用服务：System Prompt 构造（用户画像+习惯摘要+指标趋势）
- [x] 6.2 后端实现 `/api/analysis/chat` POST 接口：接收消息数组，调用 DeepSeek，返回 AI 回复
- [x] 6.3 前端实现 Pinia chatStore：管理对话历史（本地 StorageSync 保存）
- [x] 6.4 前端实现 AI 对话页面（analysis/index）：聊天界面，消息气泡，输入框
- [x] 6.5 前端实现"开始新分析"功能：清空历史，自动生成首轮分析

## 7. 体检报告 OCR 模块

- [x] 7.1 后端封装 SiliconFlow OCR 调用服务：接收 base64 图片，调用 PaddleOCR-VL
- [x] 7.2 后端实现 `/api/report/analyze` POST 接口：接收图片，OCR → DeepSeek 分析异常指标
- [x] 7.3 前端实现报告上传页面（report/index）：拍照/相册选择，上传进度展示
- [x] 7.4 前端实现报告结果页面（report/result）：异常指标卡片，可展开查看解读

## 8. 首页与整合

- [x] 8.1 前端实现首页（index/index）：今日概览（习惯录入状态、指标打卡提醒、快捷入口）
- [x] 8.2 前端实现底部 TabBar：首页、习惯、指标、AI 分析、我的
- [x] 8.3 整合所有模块的导航流程，确保页面跳转和数据流完整
- [ ] 8.4 端到端测试：登录 → 引导录入 → 习惯录入 → 指标打卡 → AI 分析 → 报告上传
