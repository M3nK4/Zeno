// Shared type definitions for whatsapp-agent

// --- LLM Types ---

export type LlmProvider = 'claude' | 'openai' | 'gemini';

export interface LlmMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface LlmRequest {
  readonly provider: string;
  readonly model: string;
  readonly apiKey: string;
  readonly systemPrompt: string;
  readonly messages: readonly LlmMessage[];
}

// --- Database Types ---

export interface DbMessage {
  readonly id: number;
  readonly phone: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly media_type: string | null;
  readonly media_url: string | null;
  readonly timestamp: string;
}

export interface ConversationSummary {
  readonly phone: string;
  readonly lastMessage: string;
  readonly lastTimestamp: string;
  readonly messageCount: number;
}

export interface DbStats {
  readonly totalMessages: number;
  readonly totalConversations: number;
  readonly messagesToday: number;
  readonly activeToday: number;
}

export interface CountRow {
  readonly c: number;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedResult<T> {
  readonly data: T[];
  readonly pagination: PaginationMeta;
}

// --- Evolution API / Webhook Types ---

export type MediaType = 'voice' | 'image';

export interface EvolutionMessageKey {
  readonly remoteJid?: string;
  readonly fromMe?: boolean;
  readonly id: string;
}

export interface EvolutionMessageContent {
  readonly conversation?: string;
  readonly extendedTextMessage?: { readonly text: string };
  readonly audioMessage?: Record<string, unknown>;
  readonly imageMessage?: {
    readonly caption?: string;
    readonly mimetype?: string;
  };
}

export interface EvolutionWebhookData {
  readonly key: EvolutionMessageKey;
  readonly message?: EvolutionMessageContent;
}

export interface EvolutionWebhookBody {
  readonly event: string;
  readonly data?: EvolutionWebhookData;
}

export interface EvolutionInstanceStatus {
  readonly connected: boolean;
  readonly name: string;
}

// --- SMTP Types ---

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
}

// --- Supported image MIME types for Claude Vision ---

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

export function isSupportedImageType(mime: string): mime is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mime);
}
