module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const summary = body?.summary;
  if (!summary) return res.status(400).json({ error: "Sem dados" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key não encontrada" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `És um analista de gestão de apostas desportivas. Analisa os dados e dá feedback em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois:\n{"score":7,"headline":"Resumo em 60 chars","insights":["insight1","insight2","insight3"],"warnings":["aviso1"],"tips":["dica1","dica2"]}`
        }]
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      return res.status(500).json({ error: `Anthropic ${response.status}: ${raw.slice(0,300)}` });
    }

    const data = JSON.parse(raw);
    const text = data.content?.map(c => c.text || "").join("").trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Sem JSON na resposta" });
    
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
