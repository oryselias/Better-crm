// WhatsApp Integration Module
// Health CRM WhatsApp Backend - Meta Cloud API Integration

// Types and interfaces
export * from './types';

// WhatsApp Cloud API Client
export { WhatsAppCloudClient, createWhatsAppClient } from './client';

// Message handlers
export { handleIncomingMessage, archiveConversation, recordMessage } from './handlers';
