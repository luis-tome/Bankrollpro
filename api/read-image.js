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

  let imageData, mediaType;
  try {
    const b = rawBody ? JSON.parse(rawBody) : req.body;
    imageData = b?.imageData;
    mediaType = b?.mediaType || "image/jpeg";
  } catch (e) {
    return res.status(200).json({ error: "Parse body: " + e.message });
  }
  if (!imageData) return res.status(200).json({ error: "Sem imagem" });

  const SPORT_LIST = ["Ténis","Futebol","Basquetebol","Hóquei","Baseball","Rugby","MMA/UFC","Outros"];

  const prompt = `Esta imagem é um print relacionado com uma ou mais apostas desportivas. Pode vir de qualquer origem: conversa de grupo (Telegram, WhatsApp, Discord), bilhete/bet slip de uma casa de apostas (Bet365, Betano, etc.), ou uma nota manuscrita/nota de texto qualquer.

A tua tarefa é EXTRAIR as apostas visíveis na imagem e devolver APENAS um objeto JSON válido, sem markdown, sem \`\`\`, sem comentários, sem texto antes ou depois. Formato exato:

{"bets":[{"sport":"<um de: ${SPORT_LIST.join(", ")}>","event":"<equipas/jogadores, ex: 'Sinner v Alcaraz'>","market":"<tipo de mercado, ex: 'Vencedor do Jogo', '1X2', 'Over/Under Golos', use texto livre se não souberes o nome exato>","selection":"<a seleção escolhida, ex: 'Sinner vence', 'Over 2.5'>","odd":<número decimal, ex 1.85>,"units":<número de unidades SE mencionado explicitamente como 'un'/'unidade', senão null>,"stakeAmount":<valor monetário do stake SE visível como quantia (ex: 5, 10.50), senão null>,"notes":"<contexto extra útil: nome da casa de apostas, bookmaker, liga, ronda, etc — opcional>"}]}

Regras importantes:
- Se houver várias apostas na imagem (várias linhas, vários bilhetes, uma múltipla com várias seleções), devolve TODAS no array "bets", uma entrada por aposta simples. Para uma múltipla/acumulador com várias seleções e UMA odd final, cria UMA entrada com "selection" a listar as seleções separadas por " + " e "market":"Múltipla".
- Converte odds fracionárias ou americanas para odd decimal se necessário.
- Se não conseguires determinar a odd de uma aposta com confiança, NÃO a incluas no array.
- Se não conseguires identificar nenhuma aposta válida na imagem, devolve {"bets":[]}.
- Não inventes valores que não vês na imagem — deixa "units", "stakeAmount" ou "notes" como null/vazio se não estiverem visíveis.
- Responde só com o JSON, nada mais.`;

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
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(200).json({ error: "Anthropic " + r.status + ": " + raw.slice(0, 300) });

    const data = JSON.parse(raw);
    let modelText = (data.content || []).map(c => c.text || "").join("").trim();

    // Segurança extra: remover markdown fences caso o modelo os inclua mesmo assim
    modelText = modelText.replace(/^```json\s*/i, "").replace(/^```\s*/,"").replace(/```\s*$/,"").trim();

    let parsed;
    try {
      parsed = JSON.parse(modelText);
    } catch (e) {
      return res.status(200).json({ error: "Resposta da IA não é JSON válido: " + modelText.slice(0, 200) });
    }

    const bets = Array.isArray(parsed.bets) ? parsed.bets : [];

    // Validação/normalização mínima de cada aposta antes de devolver
    const cleanBets = bets
      .filter(b => b && typeof b.odd === "number" && b.odd > 1 && b.event && b.selection)
      .map(b => ({
        sport: SPORT_LIST.includes(b.sport) ? b.sport : "Outros",
        event: String(b.event).slice(0, 120),
        market: b.market ? String(b.market).slice(0, 60) : "Outros",
        selection: String(b.selection).slice(0, 120),
        odd: Number(b.odd),
        units: (typeof b.units === "number" && b.units > 0) ? Number(b.units) : null,
        stakeAmount: (typeof b.stakeAmount === "number" && b.stakeAmount > 0) ? Number(b.stakeAmount) : null,
        notes: b.notes ? String(b.notes).slice(0, 200) : ""
      }));

    return res.status(200).json({ bets: cleanBets });
  } catch (e) {
    return res.status(200).json({ error: "Erro: " + e.message });
  }
}
