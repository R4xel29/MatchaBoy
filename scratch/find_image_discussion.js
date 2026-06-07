const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logFilePath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\53bd395d-2d2c-4003-ae7e-7be8e6f6bad1\\.system_generated\\logs\\transcript.jsonl';

async function main() {
  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepIndex = 0;
  for await (const line of rl) {
    stepIndex++;
    try {
      const obj = JSON.parse(line);
      const content = obj.content || '';
      
      // Look for user inputs or model responses talking about "gambar" or "qris" or "import"
      if (obj.source === 'USER_EXPLICIT' && (content.includes('gambar') || content.includes('qris') || content.includes('NMID') || content.includes('import'))) {
        console.log(`--- [Step ${obj.step_index}] USER INPUT ---`);
        console.log(content.trim());
      }
      
      if (obj.source === 'MODEL' && (content.includes('5004701') || content.includes('5004702') || content.includes('NMID') || content.includes('tag 26') || content.includes('tag 51'))) {
        console.log(`--- [Step ${obj.step_index}] MODEL RESPONSE ---`);
        // print a summary of the model response to keep it concise
        console.log(content.trim().substring(0, 500) + '...');
      }
    } catch (e) {}
  }
}

main().catch(console.error);
