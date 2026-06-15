# 需求文档

## 背景
  很多人的生活习惯会引发慢性疾病，但自己却不自知，直到去体检出现问题之后才发现有些指标存在异常（如血压、血脂、尿酸等），但想要通过调整生活习惯又不知道从何处开始，所以需要一个小程序用来记录一个人的日常生活，可以从睡眠、起床时间、是否午睡，工作性质是否久坐、是否户外、是否重体力劳动，每日饮食：喝水频次、走路步数、饭菜搭配（比如可以让用户输入吃的是什么然后分析是否重油重盐）等。还可以支持上传体检报告进行文字识别，分析哪些指标的异常与生活习惯有关。

## 需求
### 1.第一次进入时会出现递进式填写，简单迅速地知道用户的基本信息，如：职业、年龄、身高、体重、性别、已知病史等，都是选择性的答案需要你自己给出选项，没有主观答案，然后存储在用户数据，进入应用后可以在我的资料处修改。

### 2.生活习惯录入功能
提供一些常用的生活指标作为表单选项，如：起床时间、睡眠时间、工作时间、饭菜搭配、运动时间等。
下面是一个用户的真实录入示例：
示例：
每天1点左右睡觉，第二天7:30左右起床。
起床后常不吃早餐，最近一两个月吃面包和牛奶。
上午上班会坐3小时看电脑办公，然后去吃饭，午饭一般是一根玉米、一杯酸梅汤、一盘炒鸡蛋、一盘炒西兰花（有黑木耳、青红椒）、一个发面烧饼。
中午回家之后站15分钟，然后会午休30分钟～1小时。
下午会坐3～4小时看电脑办公，然后去健身，爬坡30分钟之后去洗澡。
晚饭吃轻食：包含鸡胸肉、土豆泥、糙米饭、菠菜、玉米粒、西兰花、西红柿。
吃饭之后会站着15分钟。
然后开始坐着，这时候是19:00，然后坐着看电脑办公到24:00，然后上床躺着刷手机到1点睡觉。

### 3.生活习惯和身体状况分析功能
需要用户提供已知的病史，例如：咽炎、高血压、高血脂等。然后大模型根据用户的习惯和已有疾病进行分析，给出针对性建议，看看哪些生活习惯会导致当前的疾病产生，怎样调整生活习惯有助于缓解疾病，

### 4.常用指标打卡记录功能
用户可选，选择后出现在指标统计列表，如：选择体重/血压/血糖/运动时长/每日步数等。

### 5.体检报告分析功能
可以让用户上传PDF版或照片版的体检报告给大模型分析，当前指标的异常值，然后根据用户填写的生活习惯和指标打卡状况进行追踪统计。

## 可能用到的工具
### 1.在识别照片/PDF时候，会用到ocr识别功能：
参考以下文档：
# PaddleOCR-VL-1.5

## 基本信息

| 项目 | 说明 |
|------|------|
| 模型名称 | `PaddlePaddle/PaddleOCR-VL-1.5` |
| 提供方 | SiliconFlow |
| API 地址 | `https://api.siliconflow.cn/v1` |
| API 协议 | OpenAI 兼容（`/chat/completions`） |
| 费用 | 免费（Baidu 系模型） |
| 适用场景 | 图片 OCR 识别，包括文字、表格、数学公式 |

## 调用方式

### Python SDK（推荐）

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.siliconflow.cn/v1"
)

response = client.chat.completions.create(
    model="PaddlePaddle/PaddleOCR-VL-1.5",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": image_url_or_base64}
            },
            {
                "type": "text",
                "text": "OCR this image."
            }
        ]
    }]
)

result = response.choices[0].message.content
```

### cURL

```bash
curl -X POST https://api.siliconflow.cn/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "PaddlePaddle/PaddleOCR-VL-1.5",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "图片URL或base64"}},
        {"type": "text", "text": "OCR this image."}
      ]
    }]
  }'
```

## 图片输入格式

支持两种方式传入图片：

**1. URL 地址**
```python
{"type": "image_url", "image_url": {"url": "https://example.com/image.png"}}
```

**2. Base64 编码**
```python
{"type": "image_url", "image_url": {"url": "data:image/png;base64,iVBORw0KGgo..."}}
```

Base64 编码转换：
```python
import base64

with open("image.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
    data_url = f"data:image/png;base64,{b64}"
```

## Prompt 参考

| 场景 | 推荐 Prompt |
|------|-------------|
| 通用 OCR | `OCR this image.` |
| 数学公式 | `识别图片中的所有数学公式，用 LaTeX 格式输出。` |
| 表格识别 | `识别图片中的表格，用 Markdown 表格格式输出。` |
| 混合内容 | `识别图片中所有文字和公式，公式用 LaTeX 格式输出。` |

## Token 用量参考

| 图片复杂度 | 输入 tokens | 输出 tokens |
|-----------|------------|------------|
| 简单文字图片 | ~170 | ~10-50 |
| 含公式的截图 | ~300-500 | ~100-300 |
| 复杂文档页面 | ~1000+ | ~500+ |

## 测试记录

- 测试日期：2026-06-08
- 测试图片：PIL 生成的 400x200 白底文字图（含 `Hello World` 和 `E = mc^2`）
- 测试结果：成功识别，消耗 185 tokens（输入 174 + 输出 11）
- 状态：**可用，免费**

SiliconFlow 的 API Key 已配置在 `server/.env`（变量 `SILICONFLOW_API_KEY`），请勿提交到代码仓库。

### 2.在分析用户的生活习惯和指标并给出建议时，使用deepseek模型，API Key 已配置在 `server/.env`（变量 `DEEPSEEK_API_KEY`），接口文档是https://api-docs.deepseek.com/zh-cn/，使用模型：deepseek-v4-flash。
