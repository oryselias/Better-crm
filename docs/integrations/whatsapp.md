# WhatsApp Integration

Health CRM integrates with **Meta WhatsApp Cloud API** to enable direct patient communication via WhatsApp - a crucial channel for healthcare communication in India.

## Overview

This integration provides:
- **Inbound messaging**: Receive patient messages via WhatsApp webhook
- **Outbound messaging**: Send appointment reminders, lab reports, and notifications
- **Conversation tracking**: Full message history per patient
- **Auto-replies**: Configurable responses for common queries

## Architecture

```
Patient → WhatsApp → Meta Cloud API → Webhook → Next.js API → Supabase
                                                              ↓
Patient ← WhatsApp ← Meta Cloud API ← Response ← Handlers ←
```

## Setup

### 1. Meta Business Account Setup

1. Create account at [business.facebook.com](https://business.facebook.com)
2. Verify with business documents (GST certificate for India)
3. Create WhatsApp Business App at [developers.facebook.com](https://developers.facebook.com)

### 2. Configure WhatsApp Business App

1. Add **WhatsApp** product to your app
2. Navigate to WhatsApp → Getting Started
3. Note down:
   - **Phone Number ID** (e.g., `123456789012345`)
   - **WhatsApp Business Account ID**
   - **Temporary Access Token** (valid 24h, later replace with permanent)

### 3. Add Phone Number

1. WhatsApp → Phone Numbers → Add Phone Number
2. Add your WhatsApp Business number
3. Verify via OTP

### 4. Configure Webhook

1. WhatsApp → Configuration → Webhook
2. Set URL to: `https://your-domain.com/api/whatsapp/webhook`
3. Set verify token (use `WHATSAPP_VERIFY_TOKEN` env var)
4. Subscribe to: `messages`

### 5. Environment Variables

```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
```

### 6. Database Migration

Run the migration to create WhatsApp tables:

```bash
supabase db push
# or
psql $DATABASE_URL -f supabase/migrations/20260327000000_whatsapp_integration.sql
```

## API Endpoints

### Webhook Endpoint
```
POST /api/whatsapp/webhook
GET  /api/whatsapp/webhook  (verification)
```

### Messages Endpoint
```
POST /api/whatsapp/messages  (send message)
GET  /api/whatsapp/messages  (get conversation messages)
```

## Usage

### Sending a Message

```typescript
import { createWhatsAppClient } from '@/lib/whatsapp';

const client = createWhatsAppClient();
await client.sendTextMessage('919876543210', 'Your appointment is confirmed! 📅');
```

### Send via API

```bash
curl -X POST https://your-domain.com/api/whatsapp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "uuid-of-patient",
    "message": "Your lab report is ready!",
    "message_type": "text"
  }'
```

## Features

### Auto-Replies

Configure auto-replies for common patient queries:

| Keyword | Response |
|---------|----------|
| `hi`, `hello`, `help` | Welcome message with options |
| `appointment`, `book` | Appointment booking instructions |
| `report`, `lab`, `result` | Report retrieval instructions |
| `stop`, `unsubscribe` | Unsubscribe from notifications |

### Message Types Supported

- **Text messages** - Simple text responses
- **Images** - Lab reports, prescriptions shared by patients
- **Locations** - Patient sharing their location
- **Interactive** - Button replies, list selections

### Patient Identification

1. Messages from known patients (phone number in `patients.whatsapp_number`) get personalized responses
2. Unknown senders receive registration prompts
3. Conversation automatically linked to patient record

## Patterns from whatsapp-realestate-bot

This implementation adapts patterns from the `whatsapp-realestate-bot`:

### Conversation Context
- Conversation history stored in database
- Resumes from where left off for returning users
- Multi-turn qualification flows supported

### Lead Qualification (for future expansion)
```typescript
interface WhatsAppSession {
  session_type: 'qualification' | 'appointment' | 'report_request';
  collected_data: {
    name?: string;
    phone?: string;
    requirement?: string;
    // ...
  };
  status: 'active' | 'completed' | 'expired';
}
```

## Security

- **Webhook verification** via HMAC token
- **RLS policies** restrict access by clinic
- **Service role** required for webhook operations
- **Message signing** for authenticity

## Troubleshooting

### Webhook not receiving messages
1. Check webhook URL is publicly accessible
2. Verify token matches in Meta console
3. Check Supabase logs for incoming requests

### Messages not sending
1. Verify access token is valid (not expired)
2. Check phone number is verified in Meta
3. Ensure recipient has opted in to receive messages

### Database errors
1. Run migration: `supabase db push`
2. Check RLS policies allow service role access
3. Verify foreign key constraints to `patients` table

## Future Enhancements

- [ ] Hinglish mode (like realestate-bot) for regional language support
- [ ] AI-powered message responses using Claude API
- [ ] Appointment booking flow via WhatsApp
- [ ] Lab report OCR processing
- [ ] Template message approvals for marketing

## References

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform](https://business.whatsapp.com/products/business-platform)
- [Realestate Bot Patterns](../whatsapp-realestate-bot/)
