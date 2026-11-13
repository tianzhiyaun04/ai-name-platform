// 返回可用模型列表（前端下拉框用）
const { listModels } = require('../lib/model-config');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: '请使用 GET' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(listModels());
};
