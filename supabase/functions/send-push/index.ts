/**
 * send-push Edge Function
 *
 * Sends a Web Push notification to all subscribed devices for a given user.
 * Called internally (with the service-role key) whenever a new notification
 * row is inserted into public.notifications.
 *
 * Required Supabase secrets:
 *   VAPID_PUBLIC_KEY   – base64url VAPID public key
 *   VAPID_PRIVATE_KEY  – base64url VAPID private key
 *   VAPID_SUBJECT      – "mailto:admin@example.com" or your app URL
 *
 * Generate keys once with:
 *   npx web-push generate-vapid-keys
 * Then store them with:
 *   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
// @deno-types="npm:@types/web-push@3.6.4"
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    // VAPID not configured — silently succeed so callers don't break.
    return new Response(JSON.stringify({ sent: 0, reason: "vapid_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { user_id, title, message, url } = (await req.json()) as {
    user_id: string;
    title: string;
    message: string;
    url?: string;
  };

  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (error || !subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({ title, body: message, url: url ?? "/" });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove any subscriptions that are no longer valid (HTTP 410 Gone).
  const expiredEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (
      result.status === "rejected" &&
      (result.reason as { statusCode?: number })?.statusCode === 410
    ) {
      expiredEndpoints.push(subscriptions[i].endpoint);
    }
  });
  if (expiredEndpoints.length > 0) {
    await adminClient
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id)
      .in("endpoint", expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/// <reference lib="deno.ns" />
