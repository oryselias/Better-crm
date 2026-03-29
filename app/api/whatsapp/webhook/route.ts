// WhatsApp Webhook API Route
// Handles incoming messages from Meta WhatsApp Cloud API

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handlers';
import { createWhatsAppClient } from '@/lib/whatsapp/client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limiter';
import type { WhatsAppWebhookPayload } from '@/lib/whatsapp/types';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET - Webhook Verification
 * Required by Meta to verify webhook URL
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // BUG-020: Guard against missing env var — prevents silent rejection of all verification attempts
  if (!VERIFY_TOKEN) {
    console.error('[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN not configured');
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[WhatsApp Webhook] Verification request:', { mode, token, challenge });

  // Verify token matches
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[WhatsApp Webhook] Verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST - Handle incoming WhatsApp messages
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check IP rate limit
    const clientIP = getClientIP(request);
    const ipCheck = checkRateLimit(clientIP);
    if (!ipCheck.allowed) {
      console.log(`[WhatsApp Webhook] Rate limited IP: ${clientIP}`);
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // BUG-001: Validate Meta's HMAC signature before processing any payload
    const rawBody = await request.text();
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      console.error('[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured');
      return new NextResponse('Internal Server Error', { status: 500 });
    }
    const sig = request.headers.get('x-hub-signature-256') ?? '';
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
    let sigValid = false;
    try {
      sigValid = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      sigValid = false;
    }
    if (!sigValid) {
      console.warn('[WhatsApp Webhook] Invalid signature — request rejected');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;

    console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Handle webhook verification (Meta sends periodic GET requests)
    if (!payload.object) {
      return new NextResponse('OK', { status: 200 });
    }

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Skip non-messaging updates
        if (!value.messages || value.messages.length === 0) {
          console.log('[WhatsApp Webhook] No messages in payload');
          continue;
        }

        // Get phone number ID for sending responses
        const phoneNumberId = value.metadata.phone_number_id;

        // Process each message
        for (const message of value.messages) {
          console.log(`[WhatsApp Webhook] Processing message ${message.id} from ${message.from}`);

          try {
            // Handle the incoming message
            const result = await handleIncomingMessage(message, phoneNumberId);

            console.log(`[WhatsApp Webhook] Message handled:`, result.action);

            // If there's a response to send back
            if (result.response) {
              await sendResponse(message.from, result.response);
            }

            // Mark message as read
            try {
              const client = createWhatsAppClient();
              await client.markAsRead(message.id);
            } catch (e) {
              console.log('[WhatsApp Webhook] Could not mark as read:', e);
            }
          } catch (error) {
            console.error(`[WhatsApp Webhook] Error processing message ${message.id}:`, error);
          }
        }
      }
    }

    // Must respond 200 OK within 20 seconds
    return new NextResponse(JSON.stringify({ status: 'processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Send a response message back to the user
 * Queues to notification table if failed (for retry)
 */
async function sendResponse(to: string, message: string, patientId?: string): Promise<void> {
  try {
    const client = createWhatsAppClient();
    await client.sendTextMessage(to, message);
    console.log(`[WhatsApp Webhook] Sent response to ${to}`);
  } catch (error) {
    console.error(`[WhatsApp Webhook] Failed to send response to ${to}:`, error);
    // Queue for retry
    await queueFailedMessage(to, message, patientId);
  }
}

/**
 * Queue a failed message for retry
 */
async function queueFailedMessage(phone: string, content: string, patientId?: string): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // BUG-004: Include phone in metadata so the retry worker knows the recipient
    await supabase.from('whatsapp_notifications').insert({
      notification_type: 'custom',
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      content_preview: content,
      patient_id: patientId ?? null,
      metadata: { phone, content },
    });

    console.log(`[WhatsApp Webhook] Queued failed message for retry`);
  } catch (e) {
    console.error('[WhatsApp Webhook] Failed to queue message:', e);
  }
}
