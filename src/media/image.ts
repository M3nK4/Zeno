import { GoogleGenAI } from '@google/genai';
import { getApiKey, getConfig } from '../database/settings.js';
import { logger } from '../logger.js';

export async function describeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Gemini API key required for image description');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64 = imageBuffer.toString('base64');

    const response = await ai.models.generateContent({
      model: getConfig('llm_model') || 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: 'Descrivi brevemente questa immagine in italiano, in una o due frasi.' },
      ],
    });

    return response.text || 'Immagine non descrivibile';
  } catch (err) {
    logger.error({ err }, 'Image description failed');
    throw new Error(`Gemini Vision error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
