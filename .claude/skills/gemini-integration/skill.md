# Google Gemini Integration

Expert in Google Gemini API integration using the official `@google/genai` SDK (v1.41+).

## When to Use This Skill

- Integrating Google Gemini models into Node.js/TypeScript applications
- Implementing text generation, chat, vision/image understanding
- Migrating from old `@google/generative-ai` to new `@google/genai` SDK
- Choosing correct Gemini models for different use cases

## Official SDK: `@google/genai`

**IMPORTANT**: The old `@google/generative-ai` package is DEPRECATED. Always use `@google/genai`.

```bash
npm install @google/genai
```

## Client Setup

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
```

## Text Generation

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Your prompt here",
  config: {
    systemInstruction: "You are a helpful assistant.",
  },
});
console.log(response.text);  // NOT response.response.text()
```

## Multi-turn Chat

```typescript
const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  history: [
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Hi! How can I help?" }] },
  ],
  config: {
    systemInstruction: "You are a helpful assistant.",
  },
});

const response = await chat.sendMessage({ message: "Follow-up question" });
console.log(response.text);
```

### Chat History Format
- Role `"user"` for user messages
- Role `"model"` for assistant messages (NOT "assistant")
- Each message has `parts: [{ text: "..." }]`

## Image Understanding (Vision)

### Inline Base64 Data (for images < 20MB)

```typescript
const base64 = imageBuffer.toString("base64");

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    { inlineData: { mimeType: "image/jpeg", data: base64 } },
    { text: "Describe this image." },
  ],
});
console.log(response.text);
```

### Supported Image Formats
- `image/png`
- `image/jpeg`
- `image/webp`
- `image/heic`
- `image/heif`

## Available Models (as of February 2026)

### Current Production Models
| Model | ID | Best For |
|-------|-----|----------|
| Gemini 2.5 Flash | `gemini-2.5-flash` | Best price-performance, general use |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite` | Cost-efficiency, high throughput |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Advanced reasoning, complex tasks |

### Preview Models (Latest Generation)
| Model | ID | Best For |
|-------|-----|----------|
| Gemini 3 Flash | `gemini-3-flash-preview` | Speed + frontier intelligence |
| Gemini 3 Pro | `gemini-3-pro-preview` | Best multimodal understanding |

### Deprecated (shutdown March 31, 2026)
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

**DO NOT use deprecated models in new integrations.**

## Migration from `@google/generative-ai`

| Old SDK | New SDK |
|---------|---------|
| `new GoogleGenerativeAI(apiKey)` | `new GoogleGenAI({ apiKey })` |
| `client.getGenerativeModel({ model })` | `ai.models.generateContent({ model, ... })` |
| `model.startChat({ history })` | `ai.chats.create({ model, history })` |
| `chat.sendMessage(text)` | `chat.sendMessage({ message: text })` |
| `result.response.text()` | `response.text` |

## Key Differences from Old SDK

1. **Single entry point**: `GoogleGenAI` replaces multiple managers
2. **Config per request**: Not per model instantiation
3. **Property access**: `.text` property instead of `.text()` method
4. **System instructions**: Passed in `config.systemInstruction`
5. **Chat creation**: `ai.chats.create()` not `model.startChat()`

## Constraints

### MUST DO
- Use `@google/genai` (NOT `@google/generative-ai`)
- Use production-stable model IDs (`gemini-2.5-flash`, `gemini-2.5-pro`)
- Access response text via `.text` property (not `.text()` method)
- Use `role: "model"` for assistant messages (not `"assistant"`)
- Pass system instructions via `config.systemInstruction`

### MUST NOT DO
- Use deprecated models (gemini-2.0-*, gemini-1.5-*)
- Use old SDK patterns (getGenerativeModel, startChat, etc.)
- Call `.text()` as method (it's a property in new SDK)
- Use `role: "assistant"` (Gemini uses `"model"`)
