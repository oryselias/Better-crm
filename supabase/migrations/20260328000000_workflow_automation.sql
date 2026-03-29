-- Workflow Automation Triggers
-- Send WhatsApp notifications when key events occur

-- ============================================
-- Function: Send report ready notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_report_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_phone TEXT;
  v_patient_name TEXT;
  v_clinic_name TEXT;
BEGIN
  -- Only trigger when review_state changes TO 'reviewed'
  IF NEW.review_state = 'reviewed' AND OLD.review_state IS DISTINCT FROM 'reviewed' THEN
    
    -- Get patient info
    SELECT whatsapp_number, full_name INTO v_patient_phone, v_patient_name
    FROM patients
    WHERE id = NEW.patient_id;
    
    -- Get clinic name
    SELECT name INTO v_clinic_name
    FROM clinics
    WHERE id = NEW.clinic_id;
    
    -- Only send if patient has WhatsApp
    IF v_patient_phone IS NOT NULL THEN
      -- Insert notification into queue
      INSERT INTO whatsapp_notifications (
        conversation_id,
        patient_id,
        notification_type,
        scheduled_for,
        status,
        content_preview
      )
      SELECT 
        c.id,
        NEW.patient_id,
        'report_ready',
        NOW(),
        'pending',
        'Your lab report is ready - reviewed by ' || v_clinic_name
      FROM whatsapp_conversations c
      WHERE c.phone_number = v_patient_phone AND c.status = 'active'
      LIMIT 1;
      
      -- If no conversation exists, create one
      IF NOT FOUND THEN
        INSERT INTO whatsapp_conversations (
          patient_id,
          clinic_id,
          phone_number,
          wa_id,
          display_name,
          status
        ) VALUES (
          NEW.patient_id,
          NEW.clinic_id,
          v_patient_phone,
          v_patient_phone,
          COALESCE(v_patient_name, 'Patient'),
          'active'
        );
        
        -- Then insert notification
        INSERT INTO whatsapp_notifications (
          conversation_id,
          patient_id,
          notification_type,
          scheduled_for,
          status,
          content_preview
        )
        VALUES (
          lastval(),
          NEW.patient_id,
          'report_ready',
          NOW(),
          'pending',
          'Your lab report is ready - reviewed by ' || v_clinic_name
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Function: Send appointment confirmation
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_appointment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_phone TEXT;
  v_patient_name TEXT;
  v_appointment_time TEXT;
BEGIN
  -- Only trigger on INSERT with 'scheduled' status
  IF TG_OP = 'INSERT' AND NEW.status = 'scheduled' THEN
    
    -- Get patient info
    SELECT whatsapp_number, full_name INTO v_patient_phone, v_patient_name
    FROM patients
    WHERE id = NEW.patient_id;
    
    -- Format appointment time
    v_appointment_time := TO_CHAR(NEW.scheduled_at, 'FMMonth DD, FMYYYY at FMHH12:FMAM');
    
    -- Only send if patient has WhatsApp
    IF v_patient_phone IS NOT NULL THEN
      INSERT INTO whatsapp_notifications (
        conversation_id,
        patient_id,
        notification_type,
        scheduled_for,
        status,
        content_preview
      )
      SELECT 
        c.id,
        NEW.patient_id,
        'appointment_reminder',
        NEW.scheduled_at - INTERVAL '24 hours', -- 24h reminder
        'pending',
        'Appointment confirmed for ' || v_appointment_time
      FROM whatsapp_conversations c
      WHERE c.phone_number = v_patient_phone AND c.status = 'active'
      LIMIT 1;
      
      -- If no conversation exists, create one
      IF NOT FOUND THEN
        INSERT INTO whatsapp_conversations (
          patient_id,
          clinic_id,
          phone_number,
          wa_id,
          display_name,
          status
        ) VALUES (
          NEW.patient_id,
          NEW.clinic_id,
          v_patient_phone,
          v_patient_phone,
          COALESCE(v_patient_name, 'Patient'),
          'active'
        );
        
        INSERT INTO whatsapp_notifications (
          conversation_id,
          patient_id,
          notification_type,
          scheduled_for,
          status,
          content_preview
        )
        VALUES (
          lastval(),
          NEW.patient_id,
          'appointment_reminder',
          NEW.scheduled_at - INTERVAL '24 hours',
          'pending',
          'Appointment confirmed for ' || v_appointment_time
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Triggers
-- ============================================

-- Trigger for report reviewed notifications
CREATE TRIGGER trigger_notify_report_ready
  AFTER UPDATE OF review_state ON public.lab_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_report_ready();

-- Trigger for appointment confirmation
CREATE TRIGGER trigger_notify_appointment_confirmed
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_confirmed();

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.notify_report_ready() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_appointment_confirmed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_report_ready() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_appointment_confirmed() TO service_role;
