import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Exponential backoff: 5min, 15min, 1h, 3h, 9h
function getNextRetryTime(retryCount: number): Date {
  const delays = [5, 15, 60, 180, 540];
  const delayMinutes = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
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

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();

  // Find appointments in the next 24 hours that haven't been reminded
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  // Get 24h reminders
  const { data: appointments24h } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patients(id, full_name, whatsapp_number, clinic_id),
      clinic:clinics(name)
    `)
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in24Hours.toISOString());

  // Create 24h reminder notifications
  for (const apt of appointments24h || []) {
    const scheduledTime = new Date(apt.scheduled_at);
    const timeStr = scheduledTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const message = `🏥 Reminder: You have an appointment at ${apt.clinic?.name || "the clinic"} tomorrow at ${timeStr}. Please arrive 10 minutes early.`;

    // Check if already reminded
    const { data: existing } = await supabase
      .from("whatsapp_notifications")
      .select("id")
      .eq("patient_id", apt.patient_id)
      .eq("notification_type", "appointment_reminder")
      .eq("status", "sent")
      .gte("created_at", new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString())
      .single();

    if (!existing && apt.patient?.whatsapp_number) {
      const result = await sendWhatsAppMessage(apt.patient.whatsapp_number, message);

      await supabase.from("whatsapp_notifications").insert({
        patient_id: apt.patient_id,
        notification_type: "appointment_reminder",
        scheduled_for: now.toISOString(),
        sent_at: result.success ? now.toISOString() : null,
        status: result.success ? "sent" : "pending",
        content_preview: message.substring(0, 100),
        meta_message_id: result.messageId,
        error_message: result.error,
        retry_count: result.success ? 0 : 1,
        next_retry_at: result.success ? null : getNextRetryTime(1).toISOString(),
      });
    }
  }

  // Get 1h reminders
  const { data: appointments1h } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patients(id, full_name, whatsapp_number, clinic_id),
      clinic:clinics(name)
    `)
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in1Hour.toISOString());

  // Create 1h reminder notifications
  for (const apt of appointments1h || []) {
    const scheduledTime = new Date(apt.scheduled_at);
    const timeStr = scheduledTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const message = `⏰ Reminder: Your appointment at ${apt.clinic?.name || "the clinic"} is in 1 hour (${timeStr}). Please come soon.`;

    const { data: existing } = await supabase
      .from("whatsapp_notifications")
      .select("id")
      .eq("patient_id", apt.patient_id)
      .eq("notification_type", "appointment_reminder")
      .eq("status", "sent")
      .gte("created_at", new Date(now.getTime() - 90 * 60 * 1000).toISOString())
      .single();

    if (!existing && apt.patient?.whatsapp_number) {
      const result = await sendWhatsAppMessage(apt.patient.whatsapp_number, message);

      await supabase.from("whatsapp_notifications").insert({
        patient_id: apt.patient_id,
        notification_type: "appointment_reminder",
        scheduled_for: now.toISOString(),
        sent_at: result.success ? now.toISOString() : null,
        status: result.success ? "sent" : "pending",
        content_preview: message.substring(0, 100),
        meta_message_id: result.messageId,
        error_message: result.error,
        retry_count: result.success ? 0 : 1,
        next_retry_at: result.success ? null : getNextRetryTime(1).toISOString(),
      });
    }
  }

  return new Response(JSON.stringify({
    processed_24h: appointments24h?.length || 0,
    processed_1h: appointments1h?.length || 0,
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
