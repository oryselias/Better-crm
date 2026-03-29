-- WhatsApp Integration Tables
-- Support for Meta WhatsApp Cloud API and patient messaging

-- Conversations table - one per patient phone number
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  wa_id TEXT NOT NULL, -- WhatsApp account ID
  display_name TEXT DEFAULT 'WhatsApp User',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique active conversations per phone number
  UNIQUE(phone_number, status)
);

-- Add index for phone lookup
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conversations_patient ON whatsapp_conversations(patient_id);
CREATE INDEX idx_whatsapp_conversations_clinic ON whatsapp_conversations(clinic_id);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);

-- Messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- WhatsApp message ID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text', -- text, image, audio, document, location, etc.
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  twilio_sid TEXT, -- Twilio SID if using Twilio
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for message queries
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- WhatsApp Templates (for approved templates)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deprecated')),
  header_content TEXT,
  body_content TEXT NOT NULL,
  footer_content TEXT,
  button_content JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]', -- List of variable names in order
  meta_template_id TEXT, -- ID from Meta
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(clinic_id, name, language)
);

CREATE INDEX idx_whatsapp_templates_clinic ON whatsapp_templates(clinic_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status);

-- Message Templates (dynamic templates sent via API)
CREATE TABLE IF NOT EXISTS whatsapp_sent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  variables JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  meta_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sent_templates_conversation ON whatsapp_sent_templates(conversation_id);
CREATE INDEX idx_whatsapp_sent_templates_patient ON whatsapp_sent_templates(patient_id);

-- Auto-reply rules for common queries
CREATE TABLE IF NOT EXISTS whatsapp_auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL, -- Case-insensitive keyword to match
  response_type TEXT NOT NULL CHECK (response_type IN ('text', 'template', 'appointment_reminder', 'report_available')),
  response_content TEXT NOT NULL,
  template_id UUID REFERENCES whatsapp_templates(id),
  priority INTEGER DEFAULT 0, -- Higher = checked first
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(clinic_id, keyword)
);

CREATE INDEX idx_whatsapp_auto_replies_clinic ON whatsapp_auto_replies(clinic_id);
CREATE INDEX idx_whatsapp_auto_replies_keyword ON whatsapp_auto_replies(keyword);

-- Conversation sessions for multi-turn flows
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('qualification', 'appointment', 'report_request', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  collected_data JSONB DEFAULT '{}', -- Stores qualification data, appointment preferences, etc.
  current_step TEXT, -- Current step in the flow
  expires_at TIMESTAMPTZ, -- Session expiry
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sessions_conversation ON whatsapp_sessions(conversation_id);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_sessions_type ON whatsapp_sessions(session_type);

-- Notifications log
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('appointment_reminder', 'report_ready', 'prescription_ready', 'follow_up', 'custom')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  content_preview TEXT,
  meta_message_id TEXT,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_notifications_patient ON whatsapp_notifications(patient_id);
CREATE INDEX idx_whatsapp_notifications_scheduled ON whatsapp_notifications(scheduled_for);
CREATE INDEX idx_whatsapp_notifications_status ON whatsapp_notifications(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_auto_replies_updated_at
  BEFORE UPDATE ON whatsapp_auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Clinic-scoped policies (using profiles table)
-- ============================================

-- Conversations: clinic members can view
CREATE POLICY "Clinic members can view conversations"
  ON whatsapp_conversations FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Messages: clinic members can view through conversations
CREATE POLICY "Clinic members can view messages"
  ON whatsapp_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Templates: clinic members can view and manage
CREATE POLICY "Clinic members can view templates"
  ON whatsapp_templates FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Clinic members can manage templates"
  ON whatsapp_templates FOR ALL
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Auto replies: clinic members can view and manage
CREATE POLICY "Clinic members can view auto replies"
  ON whatsapp_auto_replies FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Clinic members can manage auto replies"
  ON whatsapp_auto_replies FOR ALL
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Sessions: clinic members can view through conversations
CREATE POLICY "Clinic members can view sessions"
  ON whatsapp_sessions FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM whatsapp_conversations WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Notifications: clinic members can view and manage
CREATE POLICY "Clinic members can view notifications"
  ON whatsapp_notifications FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Clinic members can manage notifications"
  ON whatsapp_notifications FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- Service role policies (for webhook access)
-- ============================================

CREATE POLICY "Service role full access conversations"
  ON whatsapp_conversations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access messages"
  ON whatsapp_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access templates"
  ON whatsapp_templates FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access auto replies"
  ON whatsapp_auto_replies FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access sessions"
  ON whatsapp_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access notifications"
  ON whatsapp_notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
