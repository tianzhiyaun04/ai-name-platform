// 部署自检接口：打开 /api/health 就能看到 Supabase 是否连通、哪些模型已配置密钥
const { listModels } = require('../lib/model-config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';

  const supabase = {
    configured: Boolean(url && key),
    host: url || null,
    reachable: false,
    status: null,
    rows: null,
    error: null,
  };

  if (supabase.configured) {
    try {
      const r = await fetch(`${url}/rest/v1/name_history?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      supabase.status = r.status;
      const text = await r.text();
      if (r.ok) {
        supabase.reachable = true;
        try {
          supabase.rows = JSON.parse(text).length;
        } catch {}
      } else {
        supabase.error = text.slice(0, 200);
      }
    } catch (e) {
      supabase.error = e.message;
    }
  }

  const models = listModels();
  const ok = supabase.reachable && models.some((m) => m.configured);

  res.status(200).json({
    ok,
    time: new Date().toISOString(),
    supabase,
    models,
  });
};
