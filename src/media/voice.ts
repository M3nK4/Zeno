import OpenAI from 'openai';
import { getApiKey } from '../database/settings.js';
import { logger } from '../logger.js';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = getApiKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key required for voice transcription (Whisper)');
  }

  try {
    const client = new OpenAI({ apiKey });

    const file = new File([new Uint8Array(audioBuffer)], 'audio.ogg', { type: 'audio/ogg' });

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'it',
    });

    return transcription.text;
  } catch (err) {
    logger.error({ err }, 'Voice transcription failed');
    throw new Error(`Whisper transcription error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
