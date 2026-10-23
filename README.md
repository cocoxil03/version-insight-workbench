# 版本洞察工作台

面向游戏产品经理的内部提效产品原型，围绕经营分析、玩家反馈和版本排期三类问题，展示从提问、场景识别到分析结果与跟进建议的完整流程。

**在线体验：** https://vercel-kappa-blush-93.vercel.app/

## 当前实现

- 前端为静态单页工作台，可切换三类场景、查看图表和样例数据，并输入业务问题。
- `/api/agent` 是 Vercel Serverless Function：根据问题选择场景，组织预置证据，调用 DeepSeek `deepseek-chat` 生成判断、证据摘要和下一步动作。
- 模型不可用时会返回预置结果，页面仍可演示完整交互。
- [产品介绍 PDF](docs/product-overview.pdf) 说明场景、流程与下一步计划。

## 运行与部署

将仓库导入 Vercel，框架选择 `Other`，根目录保持仓库根目录，并设置以下服务端环境变量：

| 变量 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | DeepSeek API Key，只能配置在服务端环境变量中 |
| `OPENAI_BASE_URL` | `https://api.deepseek.com` |
| `OPENAI_MODEL` | `deepseek-chat` |

前端页面不包含密钥。直接打开 `index.html` 可以查看静态演示；要运行模型分析，需要将 API 部署到 Vercel。

## 演示边界

业务指标、图表、证据和“工具”名称均为预置样例，不连接真实玩家日志、工单或任务系统。当前的真实调用是服务端向 DeepSeek 发起模型请求，并将结果返回页面。模型生成的判断仅供产品演示与人工复核，不代表真实业务结论或已验证的提效指标。
