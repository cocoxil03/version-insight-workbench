const scenarios = {
  revenue: {
    label: "经营分析 Agent",
    plan: ["识别时间范围与付费阈值", "调用充值流水与玩家日志", "定位异常区服与高价值玩家", "生成 PM 跟进动作"],
    tools: ["payment_log", "player_profile", "server_metrics"],
    summary: "S12 高价值玩家集中度偏高，S08 增长主要来自限时活动，需要拆分活动贡献与自然增长。",
    evidence: ["近 7 天流水 447.9 万，环比 +8.6%", "S12 高价值玩家 126 人，Top 玩家贡献集中", "S08 环比增长 23%，活动结束后存在回落风险"],
    next: ["核对活动贡献与自然增长", "拆分 Top 玩家付费结构", "同步运营追踪活动后留存"]
  },
  feedback: {
    label: "反馈归因 Agent",
    plan: ["聚合工单与社区评论", "按语义聚类负反馈", "识别影响群体与优先级", "生成修复建议"],
    tools: ["support_ticket", "community_comment", "feedback_cluster"],
    summary: "匹配等待过长是 P0 风险，奖励感知偏低更适合先优化表达，不建议直接改经济数值。",
    evidence: ["近 7 日反馈样本 4,800 条", "匹配慢占负反馈 42%", "问题集中在新服与低活跃时段"],
    next: ["优先排查新服匹配队列", "先优化奖励表达再改数值", "补充入口说明与失败原因"]
  },
  schedule: {
    label: "排期风险 Agent",
    plan: ["读取版本任务与依赖关系", "识别延期和阻塞节点", "推断下游影响", "生成今日协调清单"],
    tools: ["sprint_task", "dependency_graph", "release_calendar"],
    summary: "战斗结算接口延期会挤压提测窗口，并影响玩法验收与宣传录屏，需要 PM 当天协调。",
    evidence: ["版本任务 214 项，其中 28 项存在风险", "涉及策划、美术、程序、测试、营销 5 个团队", "距离提测窗口仅剩 3 天"],
    next: ["锁定战斗结算接口负责人", "提前约联调与验收窗口", "同步营销素材风险边界"]
  }
};

function inferScenario(query = "", fallback = "revenue") {
  const text = String(query).toLowerCase();
  if (/反馈|工单|评论|负面|差评|匹配|奖励|引导|掉线/.test(text)) return "feedback";
  if (/排期|延期|任务|上线|提测|依赖|阻塞|负责人|联调/.test(text)) return "schedule";
  if (/流水|充值|付费|玩家|区服|留存|活动|收入/.test(text)) return "revenue";
  return scenarios[fallback] ? fallback : "revenue";
}

function parseModelJson(content) {
  if (!content) return null;
  const cleaned = String(content).replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function enhanceWithModel(query, base) {
  if (!process.env.OPENAI_API_KEY) return base;

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "deepseek-chat";

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "你是游戏产品经理内部提效工作台的后台分析 Agent。请基于给定证据，输出简洁、可复核、可行动的中文结论。不要编造新数据。只返回 JSON。"
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: "返回 JSON：{summary:string,evidence:string[],next:string[]}。evidence 和 next 各保留 3 条以内。",
              question: query,
              baseSummary: base.summary,
              evidence: base.evidence,
              next: base.next
            })
          }
        ]
      })
    });

    if (!response.ok) return base;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = parseModelJson(raw);
    if (!parsed) return base;

    return {
      ...base,
      summary: parsed.summary || base.summary,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 3) : base.evidence,
      next: Array.isArray(parsed.next) ? parsed.next.slice(0, 3) : base.next,
      mode: "model"
    };
  } catch {
    return base;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = request.body || {};
  const query = body.query || "";
  const scenarioKey = inferScenario(query, body.scenario);
  const base = scenarios[scenarioKey];
  const result = await enhanceWithModel(query, { ...base, mode: "rules" });

  response.status(200).json({
    scenarioKey,
    query,
    agent: {
      label: result.label,
      mode: result.mode,
      plan: result.plan,
      tools: result.tools,
      summary: result.summary,
      evidence: result.evidence,
      next: result.next
    }
  });
}
