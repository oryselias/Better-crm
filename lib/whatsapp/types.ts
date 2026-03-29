// WhatsApp Message Types and Interfaces

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  document?: WhatsAppMedia;
  location?: WhatsAppLocation;
  interactive?: WhatsAppInteractive;
}

export interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
}

export interface WhatsAppLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppInteractive {
  type: string;
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description: string;
  };
}

export interface WhatsAppOutgoingMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  template?: WhatsAppTemplate;
}

export interface WhatsAppTemplate {
  name: string;
  language: {
    code: string;
  };
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: string;
  sub_type?: string;
  parameters?: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: string;
  text?: string;
  image?: {
    link: string;
  };
}

// Database record types
export interface WhatsAppConversation {
  id: string;
  patient_id: string;
  clinic_id: string;
  phone_number: string;
  wa_id: string;
  display_name: string;
  status: 'active' | 'archived' | 'blocked';
  last_message_at: string;
  last_message_direction: 'inbound' | 'outbound';
  unread_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  conversation_id: string;
  message_id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  media_url?: string;
  media_type?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  twilio_sid?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

export interface WhatsAppWebhookVerification {
  'hub.mode': string;
  'hub.challenge': string;
  'hub.verify_token': string;
}

// API Response types
export interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

// Lead qualification types (from whatsapp-realestate-bot patterns)
export interface LeadQualification {
  name?: string;
  phone?: string;
  requirement?: string;
  budget?: string;
  timeline?: string;
  notes?: string;
  score?: 'hot' | 'warm' | 'cold';
  score_reason?: string;
}

export interface WhatsAppSession {
  phone_number: string;
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  collected_data: Partial<LeadQualification>;
  status: 'qualifying' | 'qualified' | 'appointment_scheduled';
  last_qualification_step?: string;
}
