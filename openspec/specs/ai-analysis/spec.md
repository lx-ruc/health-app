# ai-analysis Specification

## Purpose
TBD - created by archiving change health-app-v1. Update Purpose after archive.
## Requirements
### Requirement: AI 对话分析
系统 SHALL 提供对话式 AI 分析功能，基于用户的生活习惯数据、病史和指标趋势，给出个性化健康建议。

#### Scenario: 首次发起分析
- **WHEN** 用户点击"AI 分析"进入对话页面
- **THEN** 系统自动拼接用户画像、最近 7 天习惯摘要、最近 7 天指标数据作为 context，调用 DeepSeek API，生成首轮分析报告

#### Scenario: 多轮追问
- **WHEN** 用户在对话中输入"那我午饭该怎么调整？"
- **THEN** 系统将历史对话（最近 10 轮）+ 用户新消息一起发送给 DeepSeek，返回针对性建议

### Requirement: 对话历史
系统 SHALL 在前端保存对话历史，支持查看过往对话。

#### Scenario: 查看历史对话
- **WHEN** 用户进入 AI 分析页面
- **THEN** 系统加载该用户最近的对话记录，展示为聊天界面

#### Scenario: 发起新对话
- **WHEN** 用户点击"开始新分析"
- **THEN** 系统清空当前对话历史，基于最新习惯和指标数据重新生成首轮分析

### Requirement: Prompt 构造
系统 SHALL 按以下结构构造 AI 请求：System Prompt（健康顾问角色 + 用户画像 + 习惯摘要 + 指标趋势）+ Messages（最近 10 轮对话 + 当前用户输入）。所有 AI 调用 MUST 通过后端代理，前端不直接调用 DeepSeek API。

#### Scenario: 后端代理调用
- **WHEN** 前端发送对话请求到后端
- **THEN** 后端拼接完整 prompt，调用 DeepSeek API，返回 AI 回复给前端，API Key 不暴露给前端

