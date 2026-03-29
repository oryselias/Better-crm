import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

// Exponential backoff: 5min, 15min, 1h, 3h, 9h
function getNextRetryTime(retryCount: number): Date {
  const delays = [5, 15, 60, 180, 540]; // minutes
  const delayMinutes = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    // Fallback: Meta WhatsApp API
    const response = await fetch("https://graph.facebook.com/v18.0/me/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("WHATSAPP_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  }

  // Twilio fallback
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_FROM_NUMBER,
        To: to,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  const data = await response.json();
  return { success: true, messageId: data.sid };
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get notifications ready for retry
  const now = new Date().toISOString();
  
  const { data: notifications, error } = await supabase
    .from("whatsapp_notifications")
    .select(`
      *,
      patient:patients(whatsapp_number, full_name),
      conversation:whatsapp_conversations(phone_number, wa_id)
    `)
    .eq("status", "pending")
    .neq("retry_count", 5) // Not maxed out
    .lte("next_retry_at", now)
    .limit(50);

  if (error) {
    console.error("Error fetching notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const notification of notifications || []) {
    const phone = notification.conversation?.phone_number || 
                  notification.patient?.whatsapp_number;

    if (!phone) {
      await supabase
        .from("whatsapp_notifications")
        .update({ 
          status: "failed", 
          last_error: "No phone number found",
          retry_count: notification.retry_count + 1 
        })
        .eq("id", notification.id);
      results.push({ id: notification.id, status: "skipped", reason: "No phone" });
      continue;
    }

    // Get template content or use preview
    let messageBody = notification.content_preview || "You have a new notification from your healthcare provider.";
    
    // If it's a template notification, use template variables
    if (notification.notification_type === "appointment_reminder") {
      messageBody = `⏰ Reminder: You have an appointment scheduled. Please check your app for details.`;
    } else if (notification.notification_type === "report_ready") {
      messageBody = `📋 Your lab report is ready. Please check your app to view results.`;
    }

    const result = await sendWhatsAppMessage(phone, messageBody);

    if (result.success) {
      await supabase
        .from("whatsapp_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          meta_message_id: result.messageId,
          retry_count: notification.retry_count + 1,
        })
        .eq("id", notification.id);
      results.push({ id: notification.id, status: "sent" });
    } else {
      const newRetryCount = notification.retry_count + 1;
      const isMaxed = newRetryCount >= (notification.max_retries || 5);
      
      await supabase
        .from("whatsapp_notifications")
        .update({
          status: isMaxed ? "failed" : "pending",
          last_error: result.error,
          retry_count: newRetryCount,
          next_retry_at: isMaxed ? null : getNextRetryTime(newRetryCount).toISOString(),
        })
        .eq("id", notification.id);
      results.push({ id: notification.id, status: "retry_scheduled", error: result.error });
    }
  }

  return new Response(JSON.stringify({
    processed: results.length,
    results
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
