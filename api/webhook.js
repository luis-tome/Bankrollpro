import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

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
  if (req.method !== "POST") return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const email = obj.customer_details?.email || obj.customer_email;
    const customerId = obj.customer;
    const subscriptionId = obj.subscription;
    const amountTotal = obj.amount_total || 0;
    const plan = amountTotal <= 500 ? "monthly" : "annual";

    if (email) {
      const { data: userData } = await supabase.auth.admin.getUserByEmail(email);
      if (userData?.user?.id) {
        const name = userData.user.user_metadata?.name || email.split("@")[0];

        await supabase.from("profiles")
          .update({
            subscribed: true,
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
          .eq("user_id", userData.user.id)
          .is("deleted_at", null);

        // Send subscription confirmation email
        await sendEmail("subscribed", email, name);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await supabase.from("profiles")
      .update({ subscribed: false, plan: null })
      .eq("stripe_customer_id", obj.customer)
      .is("deleted_at", null);
  }

  res.status(200).json({ received: true });
}
