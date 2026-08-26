import { GoogleGenAI } from '@google/genai';

function getCleanApiKey(): string {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw.replace(/^["']|["']$/g, '').trim();
}

const ACTIVE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
];

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
      model: firstArg.model || ACTIVE_MODELS[0],
    };
  }

  return {
    prompt: firstArg || 'Halo, tolong berikan analisa toko Matchaboy.',
    systemInstruction,
    image,
    model: model || ACTIVE_MODELS[0],
  };
}

/**
 * Generate completion text using Gemini model with active quota failover (supports multimodal)
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
  const modelsToTry = [model || ACTIVE_MODELS[0], ...ACTIVE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model: currentModel,
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
      if (text) {
        return text;
      }
    } catch (error: any) {
      console.warn(`[GEMINI_FAILOVER] Model ${currentModel} error (${error?.status || error?.message}), falling over to next model...`);
      lastError = error;
    }
  }

  throw lastError || new Error('Semua model Gemini aktif gagal merespon.');
}

/**
 * Generate streaming response using Gemini model with active quota failover (supports multimodal)
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
  const modelsToTry = [model || ACTIVE_MODELS[0], ...ACTIVE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const responseStream = await client.models.generateContentStream({
        model: currentModel,
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
    } catch (error: any) {
      console.warn(`[GEMINI_STREAM_FAILOVER] Model ${currentModel} error (${error?.status || error?.message}), trying next active model...`);
      lastError = error;
    }
  }

  throw lastError || new Error('Semua model Gemini aktif gagal memulai stream.');
}
