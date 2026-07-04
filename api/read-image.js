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

  const prompt = `Esta imagem é um print de conversa do Telegram com apostas desportivas. Transcreve EXATAMENTE o texto das apostas tal como aparece na imagem, linha a linha, preservando os emojis e a estrutura original (ex: 🎾 evento, 🎯 seleção, 💰 stake @odd).

Não adiciones comentários, explicações, markdown ou texto extra — devolve apenas as linhas transcritas, uma por linha. Se houver várias apostas, mantém a ordem em que aparecem na imagem. Se não conseguires identificar nenhuma aposta, devolve uma string vazia.`;

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
    const text = (data.content || []).map(c => c.text || "").join("").trim();

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(200).json({ error: "Erro: " + e.message });
  }
}
