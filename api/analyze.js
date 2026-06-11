module.exports = async function handler(req, res) {
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
    // support both old (summary) and new (payload) format
    payload = b?.payload || b?.summary;
  } catch(e) {
    return res.status(200).json({ error: "Parse body: " + e.message });
  }
  if (!payload) return res.status(200).json({ error: "Sem dados" });

  // Build a readable breakdown for the prompt
  const overview = payload.overview || payload;
  const byMarket = payload.byMarket || [];
  const byOddRange = payload.byOddRange || [];
  const byUnits = payload.byUnits || [];

  const marketLines = byMarket.length
    ? byMarket.map(m => `  - ${m.market}: ${m.count} apostas, ${m.wins}W/${m.losses}L, P&L ${m.pnl > 0 ? "+" : ""}${m.pnl}, SR ${m.sr}%`).join("\n")
    : "  (sem dados por mercado)";

  const oddLines = byOddRange.length
    ? byOddRange.map(o => `  - Odds ${o.range}: ${o.count} apostas, ${o.wins} acertos, P&L ${o.pnl > 0 ? "+" : ""}${o.pnl}`).join("\n")
    : "  (sem dados por range de odds)";

  const unitLines = byUnits.length
    ? byUnits.map(u => `  - ${u.units}: ${u.count} apostas, ${u.wins}W/${u.losses}L, P&L ${u.pnl > 0 ? "+" : ""}${u.pnl}`).join("\n")
    : "  (sem dados por unidades)";

  const contextBets = payload.betsWithContext || [];
  const contextLines = contextBets.length
    ? contextBets.map(b => `  - ${b.market} @${b.odd} → ${b.result} (P&L ${b.pnl > 0 ? "+" : ""}${b.pnl}) | contexto: "${b.notes}"`).join("\n")
    : null;

  const hasContext = contextBets.length > 0;

  const prompt = `És um analista de apostas desportivas experiente. Analisa os dados reais deste apostador e dá feedback direto, específico e accionável. Sem frases genéricas. Foca em padrões concretos que explicam onde está a ganhar e a perder dinheiro.

DADOS DO APOSTADOR (${payload.sport || "Desporto geral"}):

Visão geral:
  - Total apostas liquidadas: ${overview.totalBets}
  - Acertos/Erros: ${overview.wins}W / ${overview.losses}L
  - Strike Rate: ${overview.strikeRate}%
  - Odd média: ${overview.avgOdd}
  - ROI: ${overview.roi}%
  - P&L total: ${overview.pnl > 0 ? "+" : ""}${overview.pnl}
  - Banca atual: ${overview.bankroll}

Resultados por mercado (ordenado do pior para o melhor):
${marketLines}

Resultados por range de odds:
${oddLines}

Resultados por tamanho de aposta:
${unitLines}
${hasContext ? `
Apostas com contexto adicional (${contextBets.length} de ${overview.totalBets} têm notas preenchidas):
${contextLines}

IMPORTANTE: Usa o campo "contexto" para identificar padrões cruzados. Ex: se várias apostas com "favorito @1.x" têm resultados negativos, menciona isso especificamente.` : `
NOTA: O apostador não tem notas preenchidas nas apostas. A análise fica limitada aos totais por mercado e odds. Menciona nos tips que preencher o campo "Notas" com contexto (ex: "Alcaraz @1.23, terra, indoor") permite análises muito mais precisas.`}

INSTRUÇÕES:
- score: 1-10 baseado na saúde real da banca e edge demonstrado
- headline: 1 frase direta que resume o estado atual (máx 10 palavras)
- insights: 3-4 observações factuais baseadas nos dados acima. Menciona mercados específicos, ranges de odds específicos. Ex: "Perdes €X em apostas acima de odd 3.0 com SR de Y%" — usa os números reais
- warnings: 1-2 alertas sobre os padrões mais destrutivos identificados nos dados
- tips: 3-4 acções concretas e específicas. Ex: "Corta apostas no mercado X onde tens SR de Y% e P&L de -Z" ou "Concentra volume no range de odds A-B onde o teu SR é C% e P&L é positivo". Nunca dizer "aposta menos" sem especificar onde e porquê.

Responde APENAS com JSON válido sem markdown nem texto extra:
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
        max_tokens: 1000,
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
