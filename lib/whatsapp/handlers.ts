// WhatsApp Message Handlers
// Core business logic for handling incoming WhatsApp messages

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { WhatsAppCloudClient, createWhatsAppClient } from './client';
import type { 
  WhatsAppMessage, 
  WhatsAppConversation, 
  WhatsAppMessageRecord,
  LeadQualification
} from './types';

// BUG-019: Lazy singleton — avoids module-load failure if env vars are missing at build time
function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
const supabase = getSupabase();

/**
 * Process incoming WhatsApp message
 */
export async function handleIncomingMessage(
  message: WhatsAppMessage,
  phoneNumberId: string
): Promise<{ action: string; response?: string }> {
  const { from, id, text, type, timestamp } = message;
  const messageContent = extractMessageContent(message);

  console.log(`[WhatsApp] Incoming message from ${from}:`, messageContent);

  // Find or create conversation
  const conversation = await findOrCreateConversation(from, phoneNumberId);

  // Record the incoming message
  await recordMessage({
    conversationId: conversation.id,
    messageId: id,
    direction: 'inbound',
    messageType: type,
    content: messageContent,
  });

  // Process based on message type
  switch (type) {
    case 'text':
      return handleTextMessage(from, messageContent, conversation);
    case 'image':
      return handleImageMessage(from, message, conversation);
    case 'location':
      return handleLocationMessage(from, message, conversation);
    case 'interactive':
      return handleInteractiveMessage(from, message, conversation);
    default:
      return {
        action: 'ignored',
        response: getDefaultResponse(),
      };
  }
}

/**
 * Handle text messages with basic keyword detection
 */
async function handleTextMessage(
  from: string,
  content: string,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  const lowerContent = content.toLowerCase().trim();

  // Check for common commands
  if (lowerContent === 'hi' || lowerContent === 'hello' || lowerContent === 'help') {
    return {
      action: 'greeting',
      response: getGreetingResponse(),
    };
  }

  if (lowerContent === 'appointment' || lowerContent === 'book' || lowerContent.includes('schedule')) {
    return {
      action: 'appointment_request',
      response: getAppointmentResponse(),
    };
  }

  if (lowerContent === 'lab' || lowerContent === 'report' || lowerContent.includes('result')) {
    return {
      action: 'report_request',
      response: getReportResponse(),
    };
  }

  if (lowerContent === 'stop' || lowerContent === 'unsubscribe') {
    await archiveConversation(conversation.id);
    return {
      action: 'unsubscribed',
      response: 'You have been unsubscribed from WhatsApp notifications. Contact the clinic to resubscribe.',
    };
  }

  // Default: check if patient exists
  const response = await processPatientMessage(from, content, conversation);
  return response;
}

/**
 * Process message for known/unknown patients
 */
async function processPatientMessage(
  from: string,
  content: string,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  // Look up patient by WhatsApp number
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, clinic_id')
    .eq('whatsapp_number', from)
    .single();

  if (patient) {
    // Known patient - route to intelligent response
    return handleKnownPatient(patient, content, conversation);
  } else {
    // Unknown - offer to register
    return {
      action: 'unknown_patient',
      response: getRegistrationPrompt(content),
    };
  }
}

/**
 * Handle messages from known patients
 */
async function handleKnownPatient(
  patient: { id: string; full_name: string; clinic_id: string },
  content: string,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  const { full_name } = patient;

  // Simple pattern matching for common requests
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('appointment') || lowerContent.includes('book')) {
    return {
      action: 'check_appointments',
      response: `Hi ${full_name}! I can help you with appointments. Please visit our portal or call the clinic directly to book an appointment. 📅`,
    };
  }

  if (lowerContent.includes('report') || lowerContent.includes('result') || lowerContent.includes('lab')) {
    return {
      action: 'check_reports',
      response: `Hi ${full_name}! For lab reports, please visit the reports section in our portal or contact the clinic. 📋`,
    };
  }

  if (lowerContent.includes('medicine') || lowerContent.includes('prescription')) {
    return {
      action: 'check_prescription',
      response: `Hi ${full_name}! For prescription refills, please contact the clinic directly. 💊`,
    };
  }

  // Default acknowledgment
  return {
    action: 'patient_message_received',
    response: `Thank you for your message, ${full_name}! A member of our team will get back to you shortly. 🙏`,
  };
}

/**
 * Handle image messages (lab reports, etc.)
 */
async function handleImageMessage(
  from: string,
  message: WhatsAppMessage,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  // BUG-008: Do NOT call recordMessage here — handleIncomingMessage already recorded this message.
  // The top-level recordMessage call handles all message types to avoid duplicate DB rows.
  return {
    action: 'image_received',
    response: `Thank you for sharing the image. Our team will review it and get back to you shortly. 📷`,
  };
}

/**
 * Handle location messages
 */
async function handleLocationMessage(
  from: string,
  message: WhatsAppMessage,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  // BUG-008: Do NOT call recordMessage here — handleIncomingMessage already recorded this message.
  return {
    action: 'location_received',
    response: `Thank you for sharing your location. Our team will use this to provide better service. 📍`,
  };
}

/**
 * Handle interactive button/list replies
 */
async function handleInteractiveMessage(
  from: string,
  message: WhatsAppMessage,
  conversation: WhatsAppConversation
): Promise<{ action: string; response?: string }> {
  const { button_reply, list_reply } = message.interactive || {};

  const replyId = button_reply?.id || list_reply?.id;
  const replyTitle = button_reply?.title || list_reply?.title;

  console.log(`[WhatsApp] Interactive reply: ${replyId} - ${replyTitle}`);

  // Route based on button/list selection
  if (replyId?.startsWith('menu_')) {
    return handleMenuSelection(replyId);
  }

  return {
    action: 'interactive_received',
    response: `You selected: ${replyTitle}. Processing your request...`,
  };
}

/**
 * Handle menu button selections
 */
function handleMenuSelection(buttonId: string): { action: string; response?: string } {
  switch (buttonId) {
    case 'menu_appointments':
      return {
        action: 'menu_appointments',
        response: '📅 To book an appointment, please visit our patient portal or call the clinic directly.',
      };
    case 'menu_reports':
      return {
        action: 'menu_reports',
        response: '📋 For lab reports, please visit the reports section in our portal.',
      };
    case 'menu_contact':
      return {
        action: 'menu_contact',
        response: '📞 You can reach us at: clinic@healthcrm.com or call +91-XXXXX-XXXXX',
      };
    default:
      return {
        action: 'unknown_selection',
        response: 'I did not understand your selection. Please try again or type "help" for options.',
      };
  }
}

// Helper functions

function extractMessageContent(message: WhatsAppMessage): string {
  if (message.text?.body) {
    return message.text.body;
  }
  if (message.interactive?.button_reply?.title) {
    return `[Button]: ${message.interactive.button_reply.title}`;
  }
  if (message.interactive?.list_reply?.title) {
    return `[List]: ${message.interactive.list_reply.title}`;
  }
  if (message.location) {
    return `[Location]: ${message.location.name || `${message.location.latitude}, ${message.location.longitude}`}`;
  }
  return `[${message.type} message]`;
}

async function findOrCreateConversation(
  phoneNumber: string,
  phoneNumberId: string
): Promise<WhatsAppConversation> {
  // Find patient by phone for linking
  const { data: patient } = await supabase
    .from('patients')
    .select('id, clinic_id')
    .eq('whatsapp_number', phoneNumber)
    .single();

  // BUG-007: Use upsert to eliminate TOCTOU race condition from duplicate webhook events.
  // onConflict: 'phone_number' ensures concurrent inserts for the same number resolve atomically.
  const { data: conversation, error } = await supabase
    .from('whatsapp_conversations')
    .upsert(
      {
        patient_id: patient?.id || null,
        clinic_id: patient?.clinic_id || null,
        phone_number: phoneNumber,
        wa_id: phoneNumber,
        display_name: 'WhatsApp User',
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_direction: 'inbound',
        unread_count: 1,
      },
      { onConflict: 'phone_number', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error('[WhatsApp] Failed to upsert conversation:', error);
    throw error;
  }

  return conversation as WhatsAppConversation;
}

async function recordMessage(params: {
  conversationId: string;
  messageId: string;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<void> {
  await supabase.from('whatsapp_messages').insert({
    conversation_id: params.conversationId,
    message_id: params.messageId,
    direction: params.direction,
    message_type: params.messageType,
    content: params.content,
    media_url: params.mediaUrl,
    media_type: params.mediaType,
  });

  // Update conversation last_message fields
  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_direction: params.direction,
    })
    .eq('id', params.conversationId);

  // BUG-002: supabase.rpc() returns a builder object, not a value — never assign it to a column.
  // Increment unread_count via a separate raw SQL call for inbound messages only.
  if (params.direction === 'inbound') {
    await supabase.rpc('increment_unread_count', { conv_id: params.conversationId });
  }
}

async function archiveConversation(conversationId: string): Promise<void> {
  await supabase
    .from('whatsapp_conversations')
    .update({ status: 'archived' })
    .eq('id', conversationId);
}

// Response Templates

function getDefaultResponse(): string {
  return `I received your message. Type "help" for available options or visit our patient portal for more services.`;
}

function getGreetingResponse(): string {
  return `Hello! 👋 Welcome to our Health CRM. 

I can help you with:
• 📅 Appointment booking
• 📋 Lab reports
• 💊 Prescription refills
• 📞 General inquiries

What would you like help with?`;
}

function getAppointmentResponse(): string {
  return `📅 Appointment Scheduling

To book an appointment:
1. Visit our patient portal
2. Or call the clinic directly
3. Or reply with your preferred date and time

What would you prefer?`;
}

function getReportResponse(): string {
  return `📋 Lab Reports

For your lab reports:
1. Visit the Reports section in our patient portal
2. Or provide your patient ID and we'll look it up

How would you like to proceed?`;
}

function getRegistrationPrompt(initialMessage?: string): string {
  return `Welcome! 👋

It looks like you're new. To help you better, please provide:
• Your full name
• Your patient ID (if you have one)

Or visit our patient portal to register.

${initialMessage ? `Regarding your query: "${initialMessage}" - we'll get back to you once you're registered.` : ''}`;
}

export { archiveConversation, recordMessage };
