import axios, { AxiosInstance } from 'axios';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { EvolutionInstanceStatus } from '../types.js';

interface EvolutionMediaResponse {
  readonly base64: string;
}

interface EvolutionConnectionState {
  readonly instance?: {
    readonly state?: string;
  };
}

let client: AxiosInstance;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: env.evolutionApiUrl,
      headers: { apikey: env.evolutionApiKey },
      timeout: 30000,
    });
  }
  return client;
}

/** Execute a request with a single retry on failure */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, label }, 'First attempt failed, retrying once');
    return fn();
  }
}

export async function sendText(phone: string, text: string): Promise<void> {
  await withRetry(
    () => getClient().post(`/message/sendText/${env.evolutionInstance}`, {
      number: phone,
      text,
    }),
    'sendText',
  );
}

export async function downloadMedia(messageId: string): Promise<Buffer> {
  const response = await withRetry(
    () => getClient().get<EvolutionMediaResponse>(
      `/chat/getBase64FromMediaMessage/${env.evolutionInstance}`,
      { params: { id: messageId } },
    ),
    'downloadMedia',
  );
  const base64 = response.data.base64;
  return Buffer.from(base64, 'base64');
}

export async function getInstanceStatus(): Promise<EvolutionInstanceStatus> {
  try {
    const response = await getClient().get<EvolutionConnectionState>(
      `/instance/connectionState/${env.evolutionInstance}`,
    );
    const state = response.data?.instance?.state;
    return {
      connected: state === 'open',
      name: env.evolutionInstance,
    };
  } catch {
    return { connected: false, name: env.evolutionInstance };
  }
}
