import axios from 'axios'

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || ''
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1'

export async function ocrImage(base64Image: string): Promise<string> {
  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`

  const res = await axios.post(
    `${SILICONFLOW_BASE_URL}/chat/completions`,
    {
      model: 'PaddlePaddle/PaddleOCR-VL-1.5',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: '请识别这张体检报告图片中的所有文字内容，包括指标名称、数值、单位、参考范围，按原始排版输出。' },
          ],
        },
      ],
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    },
  )

  return res.data.choices[0].message.content
}
