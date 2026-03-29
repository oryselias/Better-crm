// WhatsApp Cloud API Client
// Implements Meta WhatsApp Cloud API for sending/receiving messages

import type { WhatsAppOutgoingMessage, WhatsAppAPIResponse } from './types';

const WHATSAPP_API_VERSION = 'v21.0';

export interface WhatsAppClientConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string;
}

export class WhatsAppCloudClient {
  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(config: WhatsAppClientConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.baseUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
  }

  /**
   * Send a text message to a WhatsApp user
   */
  async sendTextMessage(to: string, body: string): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    };

    return this.sendMessage(payload);
  }

  /**
   * Send an image message
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'en',
    components?: WhatsAppOutgoingMessage['template'] extends { components?: infer C } ? C : never
  ): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Send a generic reply message
   */
  async sendReply(
    to: string,
    reply: string
  ): Promise<WhatsAppAPIResponse> {
    return this.sendTextMessage(to, reply);
  }

  /**
   * Send a typing indicator (simulated via direct message)
   */
  async sendTypingIndicator(to: string, isTyping: boolean): Promise<void> {
    // WhatsApp Cloud API doesn't support real typing indicators
    // This is a placeholder for potential Twilio integration
    console.log(`[WhatsApp] Typing indicator for ${to}: ${isTyping}`);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  }

  /**
   * Upload media to WhatsApp servers
   */
  async uploadMedia(
    mediaUrl: string,
    mimeType: string
  ): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/media`;

    const response = await fetch(mediaUrl);
    const mediaBuffer = await response.arrayBuffer();

    const uploadResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': mimeType,
      },
      body: mediaBuffer,
    });

    return uploadResponse.json();
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    const url = `${this.baseUrl}/${mediaId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.json();
    return data.url;
  }

  /**
   * Core message sending method
   */
  private async sendMessage(
    payload: WhatsAppOutgoingMessage
  ): Promise<WhatsAppAPIResponse> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp] Send message failed:', error);
      throw new Error(`Failed to send WhatsApp message: ${error}`);
    }

    return response.json();
  }

  /**
   * Get phone number details
   */
  async getPhoneNumberInfo(): Promise<{
    id: string;
    name: string;
    profile: string;
  }> {
    const url = `${this.baseUrl}/${this.phoneNumberId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    return response.json();
  }
}

// Factory function for creating client from environment
export function createWhatsAppClient(): WhatsAppCloudClient {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'Missing WhatsApp configuration: WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required'
    );
  }

  return new WhatsAppCloudClient({
    phoneNumberId,
    accessToken,
  });
}
