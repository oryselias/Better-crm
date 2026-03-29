-- Workflow triggers for WhatsApp notifications
-- 1. Report reviewed → notify patient
-- 2. Appointment created → confirmation

-- Function to get patient phone
CREATE OR REPLACE FUNCTION get_patient_whatsapp(p_patient_id UUID)
RETURNS TEXT AS $$
  SELECT whatsapp_number FROM patients WHERE id = p_patient_id;
$$ LANGUAGE SQL STABLE;

-- Trigger function for report reviewed
CREATE OR REPLACE FUNCTION notify_on_report_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_phone TEXT;
  v_report_summary TEXT;
BEGIN
  -- Only trigger when review_state changes to 'reviewed'
  IF NEW.review_state = 'reviewed' AND OLD.review_state != 'reviewed' THEN
    SELECT whatsapp_number INTO v_patient_phone FROM patients WHERE id = NEW.patient_id;
    
    IF v_patient_phone IS NOT NULL THEN
      -- Create notification
      INSERT INTO whatsapp_notifications (
        patient_id,
        notification_type,
        scheduled_for,
        status,
        content_preview
      ) VALUES (
        NEW.patient_id,
        'report_ready',
        NOW(),
        'pending',
        'Your lab report is ready. Please check your app for results.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_report_reviewed
AFTER UPDATE OF review_state ON public.lab_reports
FOR EACH ROW
EXECUTE FUNCTION notify_on_report_reviewed();

-- Function for appointment confirmation
CREATE OR REPLACE FUNCTION notify_on_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_phone TEXT;
  v_clinic_name TEXT;
  v_time_str TEXT;
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    SELECT whatsapp_number INTO v_patient_phone FROM patients WHERE id = NEW.patient_id;
    SELECT name INTO v_clinic_name FROM clinics WHERE id = NEW.clinic_id;
    
    -- Format time
    v_time_str := TO_CHAR(NEW.scheduled_at, 'FMHH12:MI AM');
    
    IF v_patient_phone IS NOT NULL THEN
      INSERT INTO whatsapp_notifications (
        patient_id,
        notification_type,
        scheduled_for,
        status,
        content_preview
      ) VALUES (
        NEW.patient_id,
        'appointment_reminder',
        NOW(),
        'pending',
        'Your appointment at ' || COALESCE(v_clinic_name, 'the clinic') || ' is confirmed for ' || v_time_str || '.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION notify_on_appointment_created();
