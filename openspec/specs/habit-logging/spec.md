# habit-logging Specification

## Purpose
TBD - created by archiving change health-app-v1. Update Purpose after archive.
## Requirements
### Requirement: 每日习惯录入
系统 SHALL 提供结构化的每日习惯录入表单，包含以下字段：睡眠时间、起床时间、是否午睡及午睡时长、工作时间（久坐/户外/体力）、三餐饮食描述、运动类型和时长、每日步数（可选手动录入）。

#### Scenario: 完成今日习惯录入
- **WHEN** 用户在习惯录入页面填写完所有必填项并提交
- **THEN** 系统保存当日习惯记录到本地和后端，首页显示"今日已录入"

#### Scenario: 重复录入提示
- **WHEN** 用户已录入今日习惯，再次点击录入
- **THEN** 系统加载已有记录，用户可修改后重新提交（覆盖当日记录）

### Requirement: 饮食录入方式
系统 SHALL 支持两种饮食录入方式：手动输入食物名称 + 文字描述。

#### Scenario: 手动描述饮食
- **WHEN** 用户在午餐字段输入"一根玉米、一杯酸梅汤、一盘炒鸡蛋、一盘炒西兰花"
- **THEN** 系统保存该文字描述，AI 分析时基于此给出饮食建议

### Requirement: 习惯历史查看
系统 SHALL 支持查看过去 30 天的习惯记录，按日期展示。

#### Scenario: 查看历史
- **WHEN** 用户进入历史页面
- **THEN** 系统按日期倒序展示过去 30 天的习惯记录列表，点击可查看详情

