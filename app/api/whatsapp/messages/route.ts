// WhatsApp Messages API Route
// Send messages to patients via WhatsApp

import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClient } from '@/lib/whatsapp/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// BUG-019: Service-role client created lazily (inside handlers) to avoid module-load failures
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST - Send a WhatsApp message
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // BUG-003: Require authenticated user before sending messages
    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const body = await request.json();
    const { patient_id, conversation_id, message, message_type = 'text' } = body;

    let phoneNumber: string;

    // Get phone number from patient_id or conversation_id
    if (patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('whatsapp_number, full_name')
        .eq('id', patient_id)
        .single();

      if (!patient?.whatsapp_number) {
        return NextResponse.json(
          { error: 'Patient has no WhatsApp number on file' },
          { status: 400 }
        );
      }

      phoneNumber = patient.whatsapp_number;
    } else if (conversation_id) {
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('phone_number')
        .eq('id', conversation_id)
        .single();

      if (!conversation?.phone_number) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      phoneNumber = conversation.phone_number;
    } else {
      return NextResponse.json(
        { error: 'patient_id or conversation_id is required' },
        { status: 400 }
      );
    }

    // Send the message
    const client = createWhatsAppClient();

    let response;
    if (message_type === 'text' || !message_type) {
      response = await client.sendTextMessage(phoneNumber, message);
    } else if (message_type === 'image') {
      response = await client.sendImageMessage(
        phoneNumber,
        message.url,
        message.caption
      );
    } else {
      return NextResponse.json(
        { error: `Unsupported message type: ${message_type}` },
        { status: 400 }
      );
    }

    // Record the outgoing message
    if (conversation_id) {
      await supabase.from('whatsapp_messages').insert({
        conversation_id,
        message_id: response.messages?.[0]?.id || `outgoing_${Date.now()}`,
        direction: 'outbound',
        message_type,
        content: message_type === 'text' ? message : message.caption || '[Media message]',
        media_url: message_type === 'image' ? message.url : null,
        media_type: message_type === 'image' ? 'image/*' : null,
        status: 'sent',
      });

      // Update conversation
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_direction: 'outbound',
        })
        .eq('id', conversation_id);
    }

    return NextResponse.json({
      success: true,
      message_id: response.messages?.[0]?.id,
      phone_number: phoneNumber,
    });
  } catch (error) {
    console.error('[WhatsApp API] Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get conversation messages
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get('conversation_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversation_id is required' },
      { status: 400 }
    );
  }

  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[WhatsApp API] Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages });
}
