import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function sendEmail(type, email, name) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://mybankrollpro.vercel.app";
    await fetch(`${baseUrl}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, email, name })
    });
  } catch(e) {
    console.error("sendEmail error:", e.message);
  }
}

export default async function handler(req, res) {
  // Security check - only allow from Vercel cron
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const now = new Date();
  let emailsSent = 0;

  // Get all non-subscribed profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email, user_name, user_trial_start, trial_start, subscribed")
    .eq("subscribed", false)
    .is("deleted_at", null);

  if (!profiles) return res.status(200).json({ sent: 0 });

  // Get unique users (one email per user, not per bankroll)
  const uniqueUsers = {};
  for (const p of profiles) {
    if (!uniqueUsers[p.user_id]) {
      uniqueUsers[p.user_id] = p;
    }
  }

  for (const p of Object.values(uniqueUsers)) {
    if (!p.email) continue;

    const trialStart = new Date(p.user_trial_start || p.trial_start);
    const daysSince = Math.floor((now - trialStart) / 86400000);
    const name = p.user_name || p.email.split("@")[0];

    // Day 3 email
    if (daysSince === 3) {
      await sendEmail("trial_day3", p.email, name);
      emailsSent++;
      console.log(`Day 3 email sent to ${p.email}`);
    }

    // Day 6 email
    if (daysSince === 6) {
      await sendEmail("trial_day6", p.email, name);
      emailsSent++;
      console.log(`Day 6 email sent to ${p.email}`);
    }
  }

  return res.status(200).json({ sent: emailsSent, checked: Object.keys(uniqueUsers).length });
}
