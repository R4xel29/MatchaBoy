import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const geminiClient = new GoogleGenAI({ apiKey });

/**
 * Generate completion text using Gemini model with fallback
 */
export async function generateStoreAIResponse({
  systemInstruction,
  prompt,
  model = 'gemini-2.5-flash',
}: {
  systemInstruction?: string;
  prompt: string;
  model?: string;
}): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  try {
    const response = await geminiClient.models.generateContent({
      model,
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

    return response.text?.trim() || 'Maaf, saya tidak dapat menghasilkan respon saat ini.';
  } catch (error: any) {
    console.error('[GEMINI_HELPER] Primary model error, trying fallback:', error?.message);
    
    // Fallback to gemini-2.0-flash
    try {
      const fallbackResponse = await geminiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: systemInstruction
          ? { systemInstruction, temperature: 0.7 }
          : { temperature: 0.7 },
      });
      return fallbackResponse.text?.trim() || 'Maaf, saya tidak dapat menghasilkan respon saat ini.';
    } catch (fallbackError) {
      console.error('[GEMINI_HELPER] Fallback error:', fallbackError);
      throw error;
    }
  }
}
