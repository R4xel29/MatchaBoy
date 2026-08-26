import { GoogleGenAI } from '@google/genai';

function getCleanApiKey(): string {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw.replace(/^["']|["']$/g, '').trim();
}

const apiKey = getCleanApiKey();

export const geminiClient = new GoogleGenAI({ apiKey });

const DEFAULT_MODEL = 'gemini-3.6-flash';

interface GenAIOptions {
  systemInstruction?: string;
  prompt: string;
  image?: { mimeType: string; data: string };
  model?: string;
}

function normalizeArgs(
  firstArg: string | GenAIOptions,
  systemInstruction?: string,
  image?: { mimeType: string; data: string },
  model?: string
): GenAIOptions {
  if (typeof firstArg === 'object' && firstArg !== null) {
    return {
      prompt: firstArg.prompt || 'Halo, tolong berikan analisa toko Matchaboy.',
      systemInstruction: firstArg.systemInstruction,
      image: firstArg.image,
      model: firstArg.model || DEFAULT_MODEL,
    };
  }

  return {
    prompt: firstArg || 'Halo, tolong berikan analisa toko Matchaboy.',
    systemInstruction,
    image,
    model: model || DEFAULT_MODEL,
  };
}

/**
 * Generate completion text using Gemini model (gemini-3.6-flash, supports multimodal)
 */
export async function generateStoreAIResponse(
  optionsOrPrompt: string | GenAIOptions,
  sysInst?: string,
  img?: { mimeType: string; data: string },
  mdl?: string
): Promise<string> {
  const key = getCleanApiKey();
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const { prompt, systemInstruction, image, model } = normalizeArgs(optionsOrPrompt, sysInst, img, mdl);

  const cleanPrompt = (prompt && prompt.trim()) ? prompt.trim() : 'Halo, tolong berikan analisa data toko Matchaboy.';
  const contentsPayload: any = image?.data
    ? [
        { text: cleanPrompt },
        { inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } },
      ]
    : cleanPrompt;

  const client = new GoogleGenAI({ apiKey: key });
  const selectedModel = model || DEFAULT_MODEL;

  const response = await client.models.generateContent({
    model: selectedModel,
    contents: contentsPayload,
    config: systemInstruction
      ? {
          systemInstruction,
          temperature: 0.7,
        }
      : {
          temperature: 0.7,
        },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Model Gemini tidak menghasilkan teks.');
  }
  return text;
}

/**
 * Generate streaming response using Gemini model (gemini-3.6-flash, supports multimodal)
 */
export async function generateStoreAIStream(
  optionsOrPrompt: string | GenAIOptions,
  sysInst?: string,
  img?: { mimeType: string; data: string },
  mdl?: string
) {
  const key = getCleanApiKey();
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const { prompt, systemInstruction, image, model } = normalizeArgs(optionsOrPrompt, sysInst, img, mdl);

  const cleanPrompt = (prompt && prompt.trim()) ? prompt.trim() : 'Halo, tolong berikan analisa data toko Matchaboy.';
  const contentsPayload: any = image?.data
    ? [
        { text: cleanPrompt },
        { inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } },
      ]
    : cleanPrompt;

  const client = new GoogleGenAI({ apiKey: key });
  const selectedModel = model || DEFAULT_MODEL;

  const responseStream = await client.models.generateContentStream({
    model: selectedModel,
    contents: contentsPayload,
    config: systemInstruction
      ? {
          systemInstruction,
          temperature: 0.7,
        }
      : {
          temperature: 0.7,
        },
  });

  return responseStream;
}
