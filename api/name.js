// 多模型 AI 起名：一套调用代码 + modelConfigMap 配置表
const { getModelConfig, listModels } = require('../lib/model-config');

const SYSTEM_PROMPT =
  '你是一名中文起名顾问。根据用户的需求给出 3 组名字，每个名字附一句寓意解释，格式简洁易读。';

function buildMessages(requirement) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `起名需求：${requirement}` },
  ];
}

async function saveHistory({ requirement, result, model }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !result) return;
  try {
    await fetch(`${url}/rest/v1/name_history`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_requirement: requirement,
        name_result: result,
        model_name: model,
      }),
    });
  } catch (e) {
    console.error('保存历史记录失败：', e.message);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '请使用 POST' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const requirement = (body.requirement || '').trim();
  const modelKey = (body.model || 'doubao').trim();

  if (!requirement) {
    res.status(400).json({ error: '请填写起名需求' });
    return;
  }

  const cfg = getModelConfig(modelKey);
  if (!cfg) {
    res.status(400).json({
      error: `不支持的模型：${modelKey}`,
      available: listModels().map((m) => m.key),
    });
  }
  if (!cfg.apiKey) {
    res.status(400).json({ error: `模型 ${cfg.label} 未配置密钥（环境变楚 ${cfg.apiKeyEnv}）` });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  let full = '';
  try {
    const upstream = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        messages: buildMessages(requirement),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      res.status(502).end(`模型调用失败：${upstream.status} ${text}`);
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            res.write(delta);
          }
        } catch {
          /* 忽略不完整分片 */
        }
      }
    }

    res.end();
    await saveHistory({ requirement, result: full, model: modelKey });
  } catch (e) {
    console.error('起名接口异常：', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.end(`\n[出错：${e.message}]`);
  }
};
