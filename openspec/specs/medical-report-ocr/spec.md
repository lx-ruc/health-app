# medical-report-ocr Specification

## Purpose
TBD - created by archiving change health-app-v1. Update Purpose after archive.
## Requirements
### Requirement: 体检报告上传
系统 SHALL 允许用户上传体检报告的图片（支持拍照或从相册选择），通过 OCR 识别报告内容。

#### Scenario: 拍照上传
- **WHEN** 用户点击"上传体检报告"，选择拍照
- **THEN** 系统打开相机，用户拍照后上传图片到后端

#### Scenario: 相册选择
- **WHEN** 用户点击"上传体检报告"，选择从相册选取
- **THEN** 系统打开相册，用户选择图片后上传

### Requirement: OCR 识别与 AI 分析
系统 SHALL 对上传的图片执行两步处理：1) SiliconFlow PaddleOCR-VL 识别文字内容 2) DeepSeek 分析识别结果，提取异常指标并给出解读。

#### Scenario: 正常识别
- **WHEN** 用户上传一张清晰的体检报告图片
- **THEN** 后端调用 OCR 提取文字，再调用 DeepSeek 分析，返回结构化结果（异常指标列表 + 每项解读 + 建议）

#### Scenario: 识别失败
- **WHEN** 用户上传的图片模糊或非体检报告
- **THEN** 系统提示"无法识别，请重新上传清晰的体检报告图片"

### Requirement: 报告结果展示
系统 SHALL 将分析结果以卡片形式展示：异常指标高亮，每项包含指标名称、数值、参考范围、偏离程度、与生活习惯的关联分析。

#### Scenario: 查看分析结果
- **WHEN** OCR 和 AI 分析完成
- **THEN** 系统展示报告结果页面，异常指标用红色标注，每项可展开查看详细解读

