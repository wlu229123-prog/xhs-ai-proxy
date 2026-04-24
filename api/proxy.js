// 小红书 AI 运营工作台 · Vercel 代理
// 部署步骤：
// 1. 把整个 vercel-proxy 文件夹上传到 GitHub（新建一个仓库即可）
// 2. 在 vercel.com 导入该仓库，点击 Deploy
// 3. 部署完成后，进入项目 Settings → Environment Variables
//    添加：ANTHROPIC_API_KEY = sk-ant-api03-xxx（你的真实 Key）
// 4. 重新部署（Redeploy）让环境变量生效
// 5. 复制部署后的域名，如 https://xhs-proxy.vercel.app
//    在 HTML 工作台右上角「配置服务地址」填入：https://xhs-proxy.vercel.app/api/proxy

module.exports = async function handler(req, res) {
  // CORS — 允许本地 HTML 文件直接调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
