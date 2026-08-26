import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const geminiClient = new GoogleGenAI({ apiKey });

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/**
 * Generate completion text using Gemini model with cascading fallbacks
 */
export async function generateStoreAIResponse({
  systemInstruction,
  prompt,
  model = 'gemini-3.6-flash',
}: {
  systemInstruction?: string;
  prompt: string;
  model?: string;
}): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const modelsToTry = [model, ...CANDIDATE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await geminiClient.models.generateContent({
        model: currentModel,
        contents: prompt,
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
 * Generate streaming response using Gemini model with cascading fallbacks
 */
export async function generateStoreAIStream({
  systemInstruction,
  prompt,
  model = 'gemini-3.6-flash',
}: {
  systemInstruction?: string;
  prompt: string;
  model?: string;
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const modelsToTry = [model, ...CANDIDATE_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const responseStream = await geminiClient.models.generateContentStream({
        model: currentModel,
        contents: prompt,
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
