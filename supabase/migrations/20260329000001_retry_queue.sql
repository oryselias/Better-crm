-- Add retry tracking to whatsapp_notifications
ALTER TABLE whatsapp_notifications
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 5;

-- Index for pending retries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_pending_retries
ON whatsapp_notifications(next_retry_at)
WHERE status = 'pending' AND retry_count < max_retries;
