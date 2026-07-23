export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "Sem API key" });

  let body;
  try {
    const chunks = [];
    await new Promise((resolve) => {
      req.on("data", chunk => chunks.push(chunk));
      req.on("end", resolve);
    });
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch(e) {
    return res.status(200).json({ error: "Parse error: " + e.message });
  }

  const { imageData, mediaType } = body;
  if (!imageData) return res.status(200).json({ error: "Sem imagem" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageData }
            },
            {
              type: "text",
              text: `Analisa esta imagem de um grupo de Telegram de apostas desportivas. Extrai TODAS as apostas visíveis e devolve APENAS o texto no seguinte formato, uma aposta por bloco:

⚽ EQUIPA_A vs EQUIPA_B
🎯 MERCADO/SELEÇÃO
💰 STAKEun @ODD

Regras:
- EQUIPA_A vs EQUIPA_B: o evento do card (ex: "Panamá vs Inglaterra")
- MERCADO/SELEÇÃO: o tipo de aposta (ex: "Hipótese dupla. 2X", "Total. Acima de (3.5)", "1X2. V1")
- STAKE: o número após "STAKE" (ex: se diz "STAKE 1.5" escreve "1.5un")
- ODD: o número da odd no card (ex: "1.971")
- Usa ⚽ para futebol, 🎾 para ténis, 🏀 para basquetebol
- Ignora códigos de casas de apostas (22BET, H6HZQ, etc)
- Se não conseguires ler uma aposta claramente, salta-a
- Não adiciones mais nada, só os blocos de apostas`
            }
          ]
        }]
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(200).json({ error: "Anthropic " + r.status + ": " + raw.slice(0, 200) });

    const data = JSON.parse(raw);
    const text = (data.content || []).map(c => c.text || "").join("").trim();
    return res.status(200).json({ text });
  } catch(e) {
    return res.status(200).json({ error: "Erro: " + e.message });
  }
}
