/**
 * Normalize Arabic text for search by replacing various forms of alef and other characters
 * to enable flexible searching regardless of diacritics
 */
export function normalizeArabicForSearch(text: string): string {
  if (!text) return text;
  
  return text
    // Normalize all forms of alef (أ، إ، آ، ا) to plain alef (ا)
    .replace(/[أإآ]/g, 'ا')
    // Normalize teh marbuta (ة) to heh (ه)
    .replace(/ة/g, 'ه')
    // Normalize yeh variations (ي، ى) to yeh (ي)
    .replace(/ى/g, 'ي')
    // Remove tashkeel (diacritics)
    .replace(/[\u064B-\u0652]/g, '');
}

/**
 * Country name aliases for common variations
 * Maps search terms to their standard database names
 */
export const COUNTRY_ALIASES: { [key: string]: string[] } = {
  'الولايات المتحدة': ['أمريكا', 'أميركا', 'امريكا', 'اميركا'],
  'المملكة المتحدة': ['بريطانيا'],
  'United States': ['usa', 'america', 'amerka', 'us'],
  'United Kingdom': ['uk'],
};

/**
 * Get all possible search terms for a given text, including aliases
 */
export function getSearchTermsWithAliases(searchTerm: string): string[] {
  const normalized = normalizeArabicForSearch(searchTerm).toLowerCase();
  const terms = [searchTerm];
  if (normalized !== searchTerm) terms.push(normalized);
  
  // Check if the search term matches any alias
  for (const [standard, aliases] of Object.entries(COUNTRY_ALIASES)) {
    const normalizedAliases = aliases.map(a => normalizeArabicForSearch(a).toLowerCase());
    const normalizedStandard = normalizeArabicForSearch(standard).toLowerCase();
    
    if (normalizedAliases.some(alias => alias.includes(normalized)) || normalizedStandard.includes(normalized)) {
      // Add both the standard name and all its aliases
      terms.push(standard);
      terms.push(...aliases);
    }
  }
  
  // Remove duplicates
  return [...new Set(terms)];
}
