/**
 * Voice Dictionary & Phonetic Normalizer for Cafe & Arum Seduh F&B Terms
 * Converts common Indonesian speech recognition mishearings into accurate English/Indonesian cafe terms.
 */

const PHONETIC_MAP: Array<{ pattern: RegExp; replacement: string }> = [
  // Arum Seduh variants
  { pattern: /\b(arum seduh|arumseduh|harum seduh|arum sedu)\b/gi, replacement: "Arum Seduh" },

  // Tea & Matcha variants
  { pattern: /\b(maca|macha|matca|matsa|macaa|matja|machaboy|macaboy|maca boy|macha boy)\b/gi, replacement: "Matcha" },
  
  // Latte variants
  { pattern: /\b(late|lete|latter|latee|lattee)\b/gi, replacement: "Latte" },
  
  // Espresso variants
  { pattern: /\b(espreso|ekspreso|expresso|espresu|ekspres)\b/gi, replacement: "Espresso" },
  
  // Croissant variants
  { pattern: /\b(kroisan|kroisang|kwasan|croisant|croisan|kroisant)\b/gi, replacement: "Croissant" },
  
  // Americano variants
  { pattern: /\b(amerikano|amerikanu|amerikanoo)\b/gi, replacement: "Americano" },
  
  // Cappuccino variants
  { pattern: /\b(kapucino|kaputino|kapusino|cappucino)\b/gi, replacement: "Cappuccino" },
  
  // Macchiato variants
  { pattern: /\b(makiato|makiyato|machiato)\b/gi, replacement: "Macchiato" },
  
  // Cloud / Float variants
  { pattern: /\b(klaud|cloudy|clout)\b/gi, replacement: "Cloud" },
  { pattern: /\b(flot|flotting|floating)\b/gi, replacement: "Float" },
  
  // Ice level
  { pattern: /\b(les ais|les es|less es|les ice)\b/gi, replacement: "Less Ice" },
  { pattern: /\b(no ais|no es|tanpa es|tanpa ais)\b/gi, replacement: "No Ice" },
  { pattern: /\b(ekstra es|ekstra ais|extra es|extra ais)\b/gi, replacement: "Extra Ice" },
  { pattern: /\b(normal es|normal ais)\b/gi, replacement: "Normal Ice" },
  
  // Sugar level
  { pattern: /\b(les sugar|les syugar|less syugar|les gula)\b/gi, replacement: "Less Sugar" },
  { pattern: /\b(no sugar|no syugar|tanpa gula|nol persen gula|0 persen gula)\b/gi, replacement: "No Sugar" },
  { pattern: /\b(ekstra sugar|ekstra gula|extra sugar|extra gula)\b/gi, replacement: "Extra Sugar" },
  
  // Milk variants
  { pattern: /\b(ot milk|otmilk|susu oat|oatmilk)\b/gi, replacement: "Oat Milk" },
  { pattern: /\b(almon milk|almonmilk|susu almond)\b/gi, replacement: "Almond Milk" },
  { pattern: /\b(fres milk|freshmilk|susu segar|susu murni)\b/gi, replacement: "Fresh Milk" },
  { pattern: /\b(soya milk|soymilk|susu kedelai)\b/gi, replacement: "Soy Milk" },
  
  // Topping & Modifier terms
  { pattern: /\b(ekstra shot|extra sot|ekstra sot)\b/gi, replacement: "Extra Shot" },
  { pattern: /\b(singel shot|single sot)\b/gi, replacement: "Single Shot" },
  { pattern: /\b(dobel shot|double sot|doble shot)\b/gi, replacement: "Double Shot" },
  { pattern: /\b(puding|pudin)\b/gi, replacement: "Pudding" },
  { pattern: /\b(jeli|zeli|jelly)\b/gi, replacement: "Jelly" },
  { pattern: /\b(karamel|caramel)\b/gi, replacement: "Caramel" },
  { pattern: /\b(vanila|vanilla)\b/gi, replacement: "Vanilla" },
  { pattern: /\b(heselnut|haselnut|hazelnut)\b/gi, replacement: "Hazelnut" },
  
  // Order types
  { pattern: /\b(teke we|tekewei|take away|takeaway|bungkus|dibungkus|bawa pulang)\b/gi, replacement: "Takeaway" },
  { pattern: /\b(dain in|dinein|makan di tempat|minum di sini|di meja)\b/gi, replacement: "Dine In" },
];

/**
 * Normalizes a raw voice transcript by replacing misrecognized phonetic words with standard terms.
 */
export function normalizeVoiceTranscript(rawText: string): string {
  if (!rawText) return "";
  
  let normalized = rawText;
  for (const { pattern, replacement } of PHONETIC_MAP) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
}
