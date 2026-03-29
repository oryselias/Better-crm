// supabase/functions/send-notifications/index.ts
// Processes pending notifications and sends them via WhatsApp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_API_VERSION = 'v21.0'

interface Notification {
  id: string
  conversation_id: string
  patient_id: string
  notification_type: string
  scheduled_for: string
  content_preview: string
}

interface Conversation {
  phone_number: string
}

// WhatsApp Cloud API call
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return { success: false, error }
  }

  const data = await response.json()
  return { success: true, messageId: data.messages?.[0]?.id }
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
  const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!

  // Check env vars
  if (!whatsappPhoneNumberId || !whatsappAccessToken) {
    return new Response(
      JSON.stringify({ error: 'WhatsApp configuration missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Fetch pending notifications that are due
  const { data: notifications, error: fetchError } = await supabase
    .from('whatsapp_notifications')
    .select('*, conversations:conversation_id(phone_number)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50) // Process in batches

  if (fetchError) {
    console.error('Error fetching notifications:', fetchError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch notifications' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const notification of notifications as any[]) {
    const conversation = notification.conversations as Conversation | null
    
    if (!conversation?.phone_number) {
      // Mark as failed - no phone number
      await supabase
        .from('whatsapp_notifications')
        .update({ 
          status: 'failed', 
          error_message: 'No conversation or phone number found' 
        })
        .eq('id', notification.id)
      results.failed++
      continue
    }

    // Format message based on notification type
    let message = notification.content_preview || ''
    
    switch (notification.notification_type) {
      case 'report_ready':
        message = `📋 ${message}\n\nPlease visit our patient portal or contact the clinic for your results.`
        break
      case 'appointment_reminder':
        message = `⏰ ${message}\n\nPlease arrive 15 minutes early. Reply STOP to unsubscribe.`
        break
      case 'prescription_ready':
        message = `💊 ${message}\n\nVisit the clinic to collect your prescription.`
        break
      case 'follow_up':
        message = `📞 ${message}\n\nPlease contact us to schedule your follow-up.`
        break
    }

    // Send via WhatsApp
    const result = await sendWhatsAppMessage(
      whatsappPhoneNumberId,
      whatsappAccessToken,
      conversation.phone_number,
      message
    )

    if (result.success) {
      // Update notification as sent
      await supabase
        .from('whatsapp_notifications')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          meta_message_id: result.messageId
        })
        .eq('id', notification.id)
      
      results.sent++
    } else {
      // Mark as failed
      await supabase
        .from('whatsapp_notifications')
        .update({ 
          status: 'failed', 
          error_message: result.error 
        })
        .eq('id', notification.id)
      
      results.failed++
      results.errors.push(`${notification.id}: ${result.error}`)
    }
  }

  console.log(`Processed ${notifications?.length || 0} notifications: ${results.sent} sent, ${results.failed} failed`)

  return new Response(
    JSON.stringify({
      processed: notifications?.length || 0,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  )
})
