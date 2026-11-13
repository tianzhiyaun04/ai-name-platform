// 起名历史查询接口
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: '请使用 GET' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.status(500).json({ error: '未配置 SUPABASE_URL / SUPABASE_ANON_KEY' });
    return;
  }

  try {
    const r = await fetch(
      `${url}/rest/v1/name_history?select=id,user_requirement,name_result,model_name,created_at&order=created_at.desc&limit=20`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
