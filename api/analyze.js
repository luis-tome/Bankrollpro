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
    payload = b?.payload || b?.summary;
  } catch(e) {
    return res.status(200).json({ error: "Parse body: " + e.message });
  }
  if (!payload) return res.status(200).json({ error: "Sem dados" });

  const overview = payload.overview || payload;
  const byMarket = payload.byMarket || [];
  const byOddRange = payload.byOddRange || [];
  const individualBets = payload.individualBets || [];

  // Build market breakdown
  const marketLines = byMarket.length
    ? byMarket.map(m =>
        `  ${m.market}: ${m.count} apostas | ${m.wins}W/${m.losses}L | SR ${m.sr}% | Odd média ${m.avgOdd} | P&L ${m.pnl > 0 ? "+" : ""}${m.pnl}`
      ).join("\n")
    : "  (sem dados por mercado)";

  // Build odd range breakdown
  const oddLines = byOddRange.length
    ? byOddRange.map(o =>
        `  Odds ${o.range}: ${o.count} apostas | ${o.wins}W/${o.losses}L | SR ${o.sr}% | P&L ${o.pnl > 0 ? "+" : ""}${o.pnl}`
      ).join("\n")
    : "  (sem dados por range de odds)";

  // Build individual bets list
  const betLines = individualBets.length
    ? individualBets.map((b, i) =>
        `  ${i+1}. [${b.result}] ${b.selection || b.market} | @${b.odd} | ${b.units}u | P&L ${b.pnl > 0 ? "+" : ""}${b.pnl}${b.notes ? ` | nota: "${b.notes}"` : ""}`
      ).join("\n")
    : "  (sem apostas individuais)";

  const hasIndividual = individualBets.length > 0;

  const prompt = `És um analista de apostas desportivas sénior. Tens acesso ao histórico REAL deste apostador — apostas individuais, mercados, odds e resultados. A tua análise tem de ser baseada nos dados concretos, não em conselhos genéricos.

DESPORTO: ${payload.sport || "Geral"}

VISÃO GERAL:
  Total apostas: ${overview.totalBets} | Acertos: ${overview.wins} | Erros: ${overview.losses}
  Strike Rate: ${overview.strikeRate}% | Odd média: ${overview.avgOdd}
  ROI: ${overview.roi}% | P&L total: ${overview.pnl > 0 ? "+" : ""}${overview.pnl} | Banca: ${overview.bankroll}

RESULTADOS POR MERCADO (pior para melhor):
${marketLines}

RESULTADOS POR RANGE DE ODDS:
${oddLines}

${hasIndividual ? `APOSTAS INDIVIDUAIS (últimas ${individualBets.length}):
${betLines}` : ""}

INSTRUÇÕES OBRIGATÓRIAS:
1. score (1-10): baseado no edge real demonstrado — não no ROI isolado. Um SR de 55% com odds médias de 2.0 é um score alto mesmo com ROI baixo.
2. headline: 1 frase directa que resume o padrão mais importante que vês nos dados.
3. insights: 3-4 observações FACTUAIS dos dados. Menciona mercados específicos pelo nome, seleções específicas se relevante, ranges de odds com números reais. Exemplo: "Em 'Vencedor do Jogo' tens 8W/14L (SR 36%) com P&L -€28 — é o teu maior buraco."
4. warnings: 1-2 alertas sobre os padrões mais destrutivos. Sê directo: "As tuas apostas acima de odd 3.0 têm SR de 20% — estás a perder sistematicamente nesse range."
5. tips: 3-4 acções CONCRETAS e específicas baseadas nos dados. NÃO dizes "aposta menos" — dizes "Corta apostas em [mercado específico] onde o teu SR é X% e perdeste €Y. Concentra em [mercado específico] onde tens SR de Z%."

Se vires padrões nas apostas individuais (ex: perdes sempre quando a seleção inclui "Over", ou quando a odd está entre 2.5-3.0), menciona-os explicitamente.

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
