import { generateQrisString } from '../src/lib/doku.js';

try {
  const qrisDefault = generateQrisString(15000, "ORDER-TEST-123");
  console.log("Generated default QRIS:", qrisDefault);
  if (qrisDefault.includes("ID.CO.QRIS.WWW")) {
    console.log("✅ Verification SUCCESS: String contains ID.CO.QRIS.WWW!");
  } else {
    console.error("❌ Verification FAILED: String does not contain ID.CO.QRIS.WWW!");
  }
} catch (error) {
  console.error("Error running verification:", error);
}
