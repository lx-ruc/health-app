import axios from 'axios'

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || ''
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1'

/**
 * 用 SiliconFlow 提供的 PaddleOCR-VL-1.5 模型做 OCR。
 * 文档参考：/Users/lixin/xhs_local/obsidian/大模型工具说明/PaddleOCR-VL-1.5.md
 * 推荐最简 prompt，长 prompt 会触发模型幻觉（实测乱码）。
 */
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
            { type: 'text', text: 'OCR this image.' },
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
