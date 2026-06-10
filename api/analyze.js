module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "Sem API key" });

  // Read raw body
  let rawBody = "";
  await new Promise((resolve) => {
    req.on("data", chunk => { rawBody += chunk.toString(); });
    req.on("end", resolve);
  });

  let summary;
  try {
    const b = rawBody ? JSON.parse(rawBody) : req.body;
    summary = b?.summary;
  } catch(e) {
    return res.status(200).json({ error: "Parse body: " + e.message + " | raw: " + rawBody.slice(0,100) });
  }

  if (!summary) return res.status(200).json({ error: "Sem summary. Body: " + rawBody.slice(0,100) });

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
          content: `Responde APENAS com JSON válido sem markdown:\n{"score":7,"headline":"texto","insights":["a","b","c"],"warnings":["w"],"tips":["t1","t2"]}\n\nDados de apostas: ${JSON.stringify(summary)}`
        }]
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(200).json({ error: "Anthropic " + r.status + ": " + raw.slice(0,200) });

    const data = JSON.parse(raw);
    const text = (data.content||[]).map(c=>c.text||"").join("").trim();
    const match = text.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: "Sem JSON: " + text.slice(0,200) });
    return res.status(200).json(JSON.parse(match[0]));
  } catch(e) {
    return res.status(200).json({ error: "Erro: " + e.message });
  }
}
