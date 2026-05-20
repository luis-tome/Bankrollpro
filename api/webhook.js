export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { createClient } = await import("@supabase/supabase-js");
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let event;
  try {
    event = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const session = event.data?.object;

  if (event.type === "checkout.session.completed") {
    const email = session?.customer_details?.email || session?.customer_email;
    const customerId = session?.customer;
    const subscriptionId = session?.subscription;
    const plan = session?.amount_total <= 399 ? "monthly" : "annual";

    if (email) {
      await supabase
        .from("profiles")
        .update({
          subscribed: true,
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("user_id", (
          await supabase.auth.admin.getUserByEmail(email)
        ).data?.user?.id);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const customerId = session?.customer;
    await supabase
      .from("profiles")
      .update({ subscribed: false, plan: null })
      .eq("stripe_customer_id", customerId);
  }

  res.status(200).json({ received: true });
}
