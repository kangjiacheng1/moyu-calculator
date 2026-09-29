// DeepSeek AI 对接（OpenAI 兼容 API）
const BASE = 'https://api.deepseek.com'

async function parseError(res) {
  let msg = `HTTP ${res.status}`
  try {
    const data = await res.json()
    if (data?.error?.message) msg = data.error.message
  } catch {
    // 保留 HTTP 状态码
  }
  return msg
}

// GET /models，返回模型 id 数组
export async function listModels(apiKey) {
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = await res.json()
  if (!Array.isArray(data?.data)) return []
  return data.data.map((m) => m.id).filter(Boolean)
}

// POST /chat/completions，返回文本
export async function chat(apiKey, model, prompt) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('API 返回内容为空')
  return text
}
