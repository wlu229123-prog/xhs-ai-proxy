// 小红书 AI 运营工作台 · 通用 AI 代理
// 支持 Anthropic Claude / DeepSeek / Kimi / 通义千问（OpenAI 兼容接口）
// 环境变量：
//   AI_PROVIDER  = "anthropic" | "deepseek" | "moonshot" | "qwen"  (默认 deepseek)
//   AI_API_KEY   = 对应平台的 API Key
//   ANTHROPIC_API_KEY = Anthropic Key（切回 Claude 时用）

const PROVIDERS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
  },
  qwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
  },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const provider = process.env.AI_PROVIDER || 'deepseek';
  const cfg = PROVIDERS[provider] || PROVIDERS.deepseek;

  // ── Anthropic 原生转发 ──────────────────────────────
  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;
    if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
    try {
      const r = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(req.body),
      });
      return res.status(r.status).json(await r.json());
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ── OpenAI 兼容接口（DeepSeek / Kimi / 通义等）──────
  const key = process.env.AI_API_KEY;
  if (!key) return res.status(500).json({ error: 'AI_API_KEY not set' });

  // 将 Claude 格式请求转换为 OpenAI 格式
  const { system, messages, max_tokens } = req.body;
  const oaiMessages = [];
  if (system) oaiMessages.push({ role: 'system', content: system });
  (messages || []).forEach(m => oaiMessages.push(m));

  try {
    const r = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: cfg.model, messages: oaiMessages, max_tokens: max_tokens || 1600 }),
    });
    const data = await r.json();

    // 将 OpenAI 格式响应转换回 Claude 格式（HTML 侧无需改动）
    if (data.choices?.[0]?.message?.content) {
      return res.status(200).json({ content: [{ type: 'text', text: data.choices[0].message.content }] });
    }
    // 透传错误
    return res.status(r.status).json({ error: data.error || data });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
