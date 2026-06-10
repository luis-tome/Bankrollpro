module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Methods", "POST"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); return res.status(200).end(); }
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Sem API key" });

  let summary;
  try { summary = (typeof req.body === "string" ? JSON.parse(req.body) : req.body)?.summary; }
  catch { return res.status(400).json({ error: "JSON inválido" }); }
  if (!summary) return res.status(400).json({ error: "Sem dados" });

  let raw;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 800,
        messages: [{ role: "user", content: `Analisa estes dados de apostas e responde APENAS com JSON (sem markdown):\n${JSON.stringify(summary)}\n\nFormato: {"score":7,"headline":"texto","insights":["a","b","c"],"warnings":["w"],"tips":["t1","t2"]}` }]
      })
    });
    raw = await r.text();
    if (!r.ok) return res.status(500).json({ error: `Anthropic erro ${r.status}: ${raw.slice(0,200)}` });
  } catch(e) { return res.status(500).json({ error: `Fetch erro: ${e.message}` }); }

  try {
    const data = JSON.parse(raw);
    const text = (data.content || []).map(c => c.text || "").join("").trim();
    const match = text.match(/\{[\s\S]+\}/);
    if (!match) return res.status(500).json({ error: `Sem JSON: ${text.slice(0,200)}` });
    return res.status(200).json(JSON.parse(match[0]));
  } catch(e) { return res.status(500).json({ error: `Parse erro: ${e.message} | raw: ${raw.slice(0,200)}` }); }
}
