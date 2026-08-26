const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/GEMINI_API_KEY=([^\r\n]+)/);
let key = match[1].trim().replace(/^["']|["']$/g, '');

const ai = new GoogleGenAI({ apiKey: key });

async function quickTest(m) {
  try {
    const res = await ai.models.generateContent({ model: m, contents: 'halo' });
    console.log("SUCCESS:", m, res.text?.slice(0, 15));
    return true;
  } catch (e) {
    console.log("FAILED:", m, e.status || e.message?.slice(0, 50));
    return false;
  }
}

async function run() {
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash'];
  for (const m of models) {
    await quickTest(m);
  }
}
run();
