import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const geminiClient = new GoogleGenAI({ apiKey });

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
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
      model: firstArg.model || 'gemini-2.5-flash',
    };
  }

  return {
    prompt: firstArg || 'Halo, tolong berikan analisa toko Matchaboy.',
    systemInstruction,
    image,
    model: model || 'gemini-2.5-flash',
  };
}

/**
 * Generate completion text using Gemini model with cascading fallbacks (supports multimodal)
 */
export async function generateStoreAIResponse(
  optionsOrPrompt: string | GenAIOptions,
  sysInst?: string,
  img?: { mimeType: string; data: string },
  mdl?: string
): Promise<string> {
  if (!apiKey) {
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

  const modelsToTry = [model || 'gemini-2.5-flash', ...CANDIDATE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await geminiClient.models.generateContent({
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
      console.warn(`[GEMINI_HELPER] Model ${currentModel} failed:`, error?.message);
      lastError = error;
    }
  }

  throw lastError || new Error('Semua model Gemini gagal merespon.');
}

/**
 * Generate streaming response using Gemini model with cascading fallbacks (supports multimodal)
 */
export async function generateStoreAIStream(
  optionsOrPrompt: string | GenAIOptions,
  sysInst?: string,
  img?: { mimeType: string; data: string },
  mdl?: string
) {
  if (!apiKey) {
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

  const modelsToTry = [model || 'gemini-2.5-flash', ...CANDIDATE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const responseStream = await geminiClient.models.generateContentStream({
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
      console.warn(`[GEMINI_HELPER] Stream model ${currentModel} failed:`, error?.message);
      lastError = error;
    }
  }

  throw lastError || new Error('Semua model Gemini gagal memulai stream.');
}
