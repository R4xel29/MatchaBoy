const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/GEMINI_API_KEY=([^\r\n]+)/);
let key = match[1].trim();
if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
  key = key.slice(1, -1).trim();
}

const ai = new GoogleGenAI({ apiKey: key });

const candidates = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.6-flash'
];

async function testQuota() {
  for (const m of candidates) {
    try {
      const res = await ai.models.generateContent({ model: m, contents: 'ping' });
      console.log('✅ ACTIVE QUOTA:', m, '-> Response:', res.text.trim().slice(0, 20));
    } catch (e) {
      console.log('❌ FAIL / RATE LIMITED:', m, '->', e.status || e.message.slice(0, 50));
    }
  }
}

testQuota();
