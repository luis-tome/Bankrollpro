export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { summary } = req.body;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
       model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `És um analista de gestão desportiva para ${summary.sport}. Analisa e dá feedback direto em português de Portugal.\n\nDados: ${JSON.stringify(summary)}\n\nResponde APENAS com JSON sem markdown:\n{"score":<1-10>,"headline":"<máx 60 chars>","insights":["...","...","..."],"warnings":["..."],"tips":["...","..."]}`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || "").join("").trim();
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro na análise" });
  }
}
