export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "Sem API key" });

  let rawBody = "";
  await new Promise((resolve) => {
    req.on("data", chunk => { rawBody += chunk.toString(); });
    req.on("end", resolve);
  });

  let payload;
  try {
    const b = rawBody ? JSON.parse(rawBody) : req.body;
    payload = b?.payload || b?.summary;
  } catch(e) {
    return res.status(200).json({ error: "Parse body: " + e.message });
  }
  if (!payload) return res.status(200).json({ error: "Sem dados" });

  const overview = payload.overview || payload;
  const byMarket = payload.byMarket || [];
  const byOddRange = payload.byOddRange || [];
  const individualBets = payload.individualBets || [];

  const marketLines = byMarket.length
    ? byMarket.map(m =>
        `  ${m.market}: ${m.count} apostas, ${m.wins} acertos, ${m.losses} erros, odd média ${m.avgOdd}, resultado: ${m.pnl > 0 ? "+" : ""}€${Math.abs(m.pnl)}`
      ).join("\n")
    : "  (sem dados)";

  const oddLines = byOddRange.length
    ? byOddRange.map(o =>
        `  Odds ${o.range}: ${o.count} apostas, ${o.wins} acertos, ${o.losses} erros, resultado: ${o.pnl > 0 ? "+" : ""}€${Math.abs(o.pnl)}`
      ).join("\n")
    : "  (sem dados)";

  const betLines = individualBets.length
    ? individualBets.map((b, i) => {
        const date = b.date ? new Date(b.date).toLocaleDateString("pt-PT", {day:"numeric", month:"long"}) : "";
        const pnlStr = `${b.pnl > 0 ? "+" : ""}€${Math.abs(b.pnl)}`;
        return `  ${i+1}. ${b.result==="WIN"?"✓":"✗"} ${b.event ? `${b.event} — ` : ""}${b.selection} (${b.market}) @${b.odd}${date ? ` | ${date}` : ""} | ${pnlStr}${b.notes ? ` | "${b.notes}"` : ""}`;
      }).join("\n")
    : "  (sem apostas)";

  const prompt = `És um amigo que percebe muito de apostas desportivas e está a analisar o histórico de um apostador. Fala de forma simples, direta e humana — como se estivesses a conversar com ele. Sem linguagem financeira ou técnica. Sem percentagens a menos que sejam mesmo necessárias.

Quando identificares um problema ou padrão, refere apostas específicas pelo nome (evento + seleção) e pelo dia em que aconteceram. Exemplo: "aquele Over 2.5 Sets no Sinner vs Alcaraz no dia 10 de Junho foi um mau negócio — odds altas demais para esse tipo de jogo."

DESPORTO: ${payload.sport || "Geral"}

RESUMO:
  ${overview.totalBets} apostas no total — ${overview.wins} acertos, ${overview.losses} erros
  Odd média: ${overview.avgOdd} | Resultado total: ${overview.pnl > 0 ? "+" : ""}€${Math.abs(overview.pnl)} | Banca atual: €${overview.bankroll}

RESULTADOS POR TIPO DE APOSTA:
${marketLines}

RESULTADOS POR VALOR DE ODD:
${oddLines}

APOSTAS INDIVIDUAIS (mais recentes primeiro):
${betLines}

INSTRUÇÕES:
- score: 1 a 10. Não é só sobre ganhar ou perder — é sobre se a abordagem faz sentido. Alguém que perde pouco com boas odds médias pode ter score alto.
- headline: uma frase curta e direta que resume o estado atual. Como dirias a um amigo: "estás a apostar bem mas nos sítios errados" ou "os resultados estão a melhorar mas há um padrão preocupante".
- insights: 3 a 4 observações concretas. Menciona apostas específicas pelo nome e data quando relevante. Fala de padrões que vês — não de estatísticas. Exemplo: "quase todas as tuas perdas grandes são em apostas Over/Under com odds acima de 3.0 — parece que estás a tentar recuperar dinheiro com apostas arriscadas."
- warnings: 1 a 2 alertas sobre o que pode estar a prejudicar mais. Direto e claro, sem rodeios.
- tips: 3 a 4 sugestões concretas e práticas. Não "aposta menos" — "tenta focar-te mais em [tipo específico de aposta] onde tens mais acertos" ou "evita apostas Over/Under quando a odd passa de X — os números mostram que não está a funcionar para ti."

Responde APENAS com JSON válido sem markdown:
{"score":7,"headline":"texto","insights":["a","b","c"],"warnings":["w"],"tips":["t1","t2","t3"]}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(200).json({ error: "Anthropic " + r.status + ": " + raw.slice(0, 300) });

    const data = JSON.parse(raw);
    const text = (data.content || []).map(c => c.text || "").join("").trim();
    const match = text.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: "Sem JSON: " + text.slice(0, 200) });

    return res.status(200).json(JSON.parse(match[0]));
  } catch(e) {
    return res.status(200).json({ error: "Erro: " + e.message });
  }
}
