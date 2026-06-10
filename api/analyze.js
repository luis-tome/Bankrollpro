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
        model: "claude-haiku-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `És um analista de gestão desportiva para ${summary.sport}. Analisa e dá feedback em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON sem markdown:\n{"score":<1-10>,"headline":"<máx 60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."]}`
        }]
      }),
    });

    const raw = await response.text();
    if (!response.ok) return res.status(500).json({ error: `Anthropic: ${raw.slice(0,200)}` });

    const data = JSON.parse(raw);
    const text = data.content?.map(c => c.text || "").join("").trim();
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
