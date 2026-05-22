import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { action, user_id } = body;
  if (!action || !user_id) return res.status(400).json({ error: "Sem dados" });

  try {
    if (action === "vip") {
      await supabase.from("profiles").update({ subscribed: true, plan: "vip" }).eq("user_id", user_id);
      return res.status(200).json({ success: true });
    }

    if (action === "revoke") {
      await supabase.from("profiles").update({ subscribed: false, plan: null }).eq("user_id", user_id);
      return res.status(200).json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("bets").delete().eq("user_id", user_id);
      await supabase.from("profiles").delete().eq("user_id", user_id);
      await supabase.auth.admin.deleteUser(user_id);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Ação desconhecida" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
