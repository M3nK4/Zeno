import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey, getConfig } from '../database/settings.js';
import { logger } from '../logger.js';
import { isSupportedImageType } from '../types.js';
import type { SupportedImageType } from '../types.js';

export async function describeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const provider = getConfig('llm_provider') || 'claude';

  if (provider === 'claude') {
    return describeWithClaude(imageBuffer, mimeType);
  } else if (provider === 'gemini') {
    return describeWithGemini(imageBuffer, mimeType);
  } else {
    return describeWithOpenai(imageBuffer, mimeType);
  }
}

async function describeWithClaude(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = getApiKey('claude');
  if (!apiKey) throw new Error('Claude API key required for image description');

  try {
    const client = new Anthropic({ apiKey });
    const base64 = imageBuffer.toString('base64');

    const mediaType: SupportedImageType = isSupportedImageType(mimeType) ? mimeType : 'image/jpeg';

    const response = await client.messages.create({
      model: getConfig('llm_model') || 'claude-sonnet-4-5-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: "Descrivi brevemente questa immagine in italiano, in una o due frasi.",
          },
        ],
      }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text || 'Immagine non descrivibile';
  } catch (err) {
    logger.error({ err, provider: 'claude' }, 'Image description failed');
    throw new Error(`Claude Vision error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function describeWithGemini(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = getApiKey('gemini');
  if (!apiKey) throw new Error('Gemini API key required for image description');

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: getConfig('llm_model') || 'gemini-2.0-flash' });
    const base64 = imageBuffer.toString('base64');

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: 'Descrivi brevemente questa immagine in italiano, in una o due frasi.' },
    ]);

    return result.response.text() || 'Immagine non descrivibile';
  } catch (err) {
    logger.error({ err, provider: 'gemini' }, 'Image description failed');
    throw new Error(`Gemini Vision error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function describeWithOpenai(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI API key required for image description');

  try {
    const client = new OpenAI({ apiKey });
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await client.chat.completions.create({
      model: getConfig('llm_model') || 'gpt-4o',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: "Descrivi brevemente questa immagine in italiano, in una o due frasi." },
        ],
      }],
    });

    return response.choices[0]?.message?.content || 'Immagine non descrivibile';
  } catch (err) {
    logger.error({ err, provider: 'openai' }, 'Image description failed');
    throw new Error(`OpenAI Vision error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
