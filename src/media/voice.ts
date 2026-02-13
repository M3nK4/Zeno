import { GoogleGenAI } from '@google/genai';
import { getApiKey, getConfig } from '../database/settings.js';
import { logger } from '../logger.js';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key required for voice transcription');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64 = audioBuffer.toString('base64');
    const model = getConfig('llm_model') || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType: 'audio/ogg', data: base64 } },
        { text: 'Trascrivi esattamente questo messaggio vocale in italiano. Restituisci solo il testo trascritto, senza commenti.' },
      ],
    });

    return response.text || '';
  } catch (err) {
    logger.error({ err }, 'Voice transcription failed');
    throw new Error(`Gemini transcription error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
