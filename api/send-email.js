module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  let body;
  try {
    const chunks = [];
    await new Promise((resolve) => {
      req.on("data", chunk => chunks.push(chunk));
      req.on("end", resolve);
    });
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch(e) {
    return res.status(200).json({ error: "Parse error" });
  }

  const { email, name, type } = body;
  if (!email || !type) return res.status(200).json({ error: "Missing fields" });

  const templates = {
    welcome: {
      subject: "Bem-vindo ao BankrollPro 📊",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
          <div style="text-align:center;margin-bottom:28px">
            <h1 style="font-size:28px;font-weight:900;margin:0">📊 BankrollPro</h1>
            <p style="color:#6b7280;margin:6px 0 0">Gestão profissional de banca desportiva</p>
          </div>
          <h2 style="font-size:20px;font-weight:800">Olá ${name||"apostador"}! 👋</h2>
          <p style="line-height:1.7;color:#374151">Bem-vindo ao BankrollPro. O teu trial de <strong>7 dias</strong> está activo — tens acesso completo a todas as funcionalidades.</p>
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0">
            <p style="font-weight:700;margin:0 0 12px">Para começares em 3 passos:</p>
            <p style="margin:8px 0">📊 <strong>1.</strong> Cria a tua primeira banca — define o valor e a percentagem por unidade</p>
            <p style="margin:8px 0">➕ <strong>2.</strong> Regista as tuas apostas — imediato ou pendente</p>
            <p style="margin:8px 0">🤖 <strong>3.</strong> Usa a Análise IA depois de 3+ apostas para perceberes onde ganhas e perdes</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="https://mybankrollpro.vercel.app" style="background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">Entrar na app →</a>
          </div>
          <p style="color:#6b7280;font-size:13px">Qualquer dúvida responde a este email ou contacta-nos em tome.luis.pt@gmail.com</p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px;text-align:center">BankrollPro · mybankrollpro.vercel.app</p>
        </div>
      `
    },
    trial_day3: {
      subject: "Como está a correr? Faltam 4 dias de trial 📊",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
          <h1 style="font-size:22px;font-weight:900">📊 BankrollPro</h1>
          <h2 style="font-size:18px;font-weight:800">Olá ${name||""}! Já estás a usar o BankrollPro? 🎯</h2>
          <p style="line-height:1.7;color:#374151">Estás no <strong>dia 3</strong> do teu trial. Faltam <strong>4 dias</strong> para terminar.</p>
          <p style="line-height:1.7;color:#374151">Já experimentaste a <strong>Análise IA</strong>? Depois de registares 3+ apostas, a IA analisa os teus padrões e diz exactamente onde estás a ganhar e a perder dinheiro — por mercado, por tipo de aposta e por range de odds.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:24px 0">
            <p style="margin:0;color:#15803d;font-weight:700">💡 Dica: preenche o campo "Notas" nas apostas com contexto extra (ex: "Alcaraz @1.23, terra") — a IA usa isso para análises muito mais precisas.</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://mybankrollpro.vercel.app" style="background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700">Abrir a app →</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center">BankrollPro · mybankrollpro.vercel.app</p>
        </div>
      `
    },
    trial_day6: {
      subject: "⏰ O teu trial termina amanhã — preço de lançamento até 31 de Agosto",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
          <h1 style="font-size:22px;font-weight:900">📊 BankrollPro</h1>
          <h2 style="font-size:18px;font-weight:800">O teu trial termina amanhã ⏰</h2>
          <p style="line-height:1.7;color:#374151">Olá ${name||""}! O teu trial de 7 dias termina <strong>amanhã</strong>. Para continuares a usar o BankrollPro sem interrupções, subscreve agora ao preço de lançamento.</p>
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0">
            <div style="display:flex;gap:16px;justify-content:center">
              <div style="flex:1;text-align:center;padding:16px;background:#fff;border-radius:10px;border:1px solid #e5e7eb">
                <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Mensal</p>
                <p style="margin:0;font-size:24px;font-weight:900">€3,99<span style="font-size:13px;font-weight:400;color:#9ca3af">/mês</span></p>
                <p style="margin:4px 0 0;font-size:11px;color:#dc2626">Depois €6,99/mês</p>
              </div>
              <div style="flex:1;text-align:center;padding:16px;background:#111827;border-radius:10px">
                <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Anual ⭐</p>
                <p style="margin:0;font-size:24px;font-weight:900;color:#fff">€19,99<span style="font-size:13px;font-weight:400;color:#9ca3af">/ano</span></p>
                <p style="margin:4px 0 0;font-size:11px;color:#4ade80">Depois €29,99/ano</p>
              </div>
            </div>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://mybankrollpro.vercel.app" style="background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700">Subscrever agora →</a>
          </div>
          <p style="color:#6b7280;font-size:13px;text-align:center">Preço de lançamento válido até 31 de Agosto · Cancela quando quiseres</p>
          <p style="color:#9ca3af;font-size:12px;text-align:center">BankrollPro · mybankrollpro.vercel.app</p>
        </div>
      `
    },
    subscribed: {
      subject: "✅ Subscrição confirmada — bem-vindo ao BankrollPro Pro!",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
          <h1 style="font-size:22px;font-weight:900">📊 BankrollPro</h1>
          <div style="text-align:center;margin:24px 0">
            <div style="font-size:56px">🎉</div>
            <h2 style="font-size:22px;font-weight:900">Subscrição confirmada!</h2>
            <p style="color:#6b7280">Olá ${name||""}! O teu acesso completo está activo.</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:24px 0">
            <p style="margin:0 0 8px;color:#15803d;font-weight:700">✓ Acesso ilimitado activado</p>
            <p style="margin:0 0 8px;color:#15803d;font-weight:700">✓ Análise IA disponível</p>
            <p style="margin:0;color:#15803d;font-weight:700">✓ Todas as funcionalidades desbloqueadas</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://mybankrollpro.vercel.app" style="background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700">Entrar na app →</a>
          </div>
          <p style="color:#6b7280;font-size:13px">Dúvidas? Contacta-nos em tome.luis.pt@gmail.com</p>
          <p style="color:#9ca3af;font-size:12px;text-align:center">BankrollPro · mybankrollpro.vercel.app</p>
        </div>
      `
    }
  };

  const template = templates[type];
  if (!template) return res.status(200).json({ error: "Unknown template" });

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return res.status(200).json({ error: "No Brevo key" });

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: "BankrollPro", email: "noreply@bankrollpro.app" },
        to: [{ email }],
        subject: template.subject,
        htmlContent: template.html
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(200).json({ error: data.message || JSON.stringify(data) });
    return res.status(200).json({ success: true, id: data.messageId });
  } catch(e) {
    return res.status(200).json({ error: e.message });
  }
}
