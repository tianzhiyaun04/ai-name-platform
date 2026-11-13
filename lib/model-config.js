// modelConfigMap：所有模型共用的配置表
// 四家平台都提供 OpenAI 兼容网关，入参（messages、stream）、SSE 分片格式、delta.content 结构、
// 鉴权头 Authorization: Bearer xxx 完全一致，所以下面只需要放地址/密钥/模型名，调用代码一套通用。
const modelConfigMap = {
  doubao: {
    label: '豆包（火山方舟）',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v1',
    apiKeyEnv: 'DOUBAO_API_KEY',
    model: process.env.DOUBAO_MODEL || 'doubao-seed-1-6-250615',
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  qwen: {
    label: '通义千问（DashScope）',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'QWEN_API_KEY',
    model: process.env.QWEN_MODEL || 'qwen-plus',
  },
  kimi: {
    label: 'Kimi（月之暗面）',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'KIMI_API_KEY',
    model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
  },
};

function getModelConfig(key) {
  const cfg = modelConfigMap[key];
  if (!cfg) return null;
  return { key, ...cfg, apiKey: process.env[cfg.apiKeyEnv] || '' };
}

function listModels() {
  return Object.keys(modelConfigMap).map((key) => {
    const cfg = getModelConfig(key);
    return { key, label: cfg.label, model: cfg.model, configured: Boolean(cfg.apiKey) };
  });
}

module.exports = { modelConfigMap, getModelConfig, listModels };
