module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "Sem API key" });

  let summary;
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    summary = b?.summary;
  } catch(e) {
    return res.status(200).json({ error: "Body parse: " + e.message });
  }
  if (!summary) return res.status(200).json({ error: "Sem summary" });

  let raw = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Responde APENAS com JSON válido sem markdown:\n{"score":7,"headline":"texto curto","insights":["a","b","c"],"warnings":["w"],"tips":["t1","t2"]}\n\nDados: ${JSON.stringify(summary)}`
        }]
      })
    });
    raw = await r.text();
    if (!r.ok) return res.status(200).json({ error: "Anthropic " + r.status + ": " + raw.slice(0,300) });
    const data = JSON.parse(raw);
    const text = (data.content||[]).map(c=>c.text||"").join("").trim();
    const match = text.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: "Sem JSON no texto: " + text.slice(0,200) });
    return res.status(200).json(JSON.parse(match[0]));
  } catch(e) {
    return res.status(200).json({ error: "Catch: " + e.message + " | raw: " + raw.slice(0,200) });
  }
}
