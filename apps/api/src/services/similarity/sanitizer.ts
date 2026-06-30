/**
 * A simple set of Portuguese stop-words to be ignored during tokenization.
 * This can be expanded based on the CPQ domain requirements.
 */
const STOP_WORDS = new Set([
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'uns',
  'umas',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'por',
  'para',
  'com',
  'sem',
  'e',
  'ou',
  'mas',
  'que',
]);

/**
 * Removes special characters, normalizes accents, and transforms text to lowercase.
 *
 * @param text The raw string from user input or database.
 * @returns The sanitized string ready for tokenization.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  return (
    text
      .toLowerCase()
      .normalize('NFD')
      // Remove diacritics (accents)
      .replace(/[\u0300-\u036f]/g, '')
      // Replace punctuation and special characters with space
      .replace(/[^\w\s]/gi, ' ')
      // Remove extra whitespaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Converts a sanitized string into an array of significant tokens (words),
 * filtering out common stop-words.
 *
 * @param sanitizedText A string that has already passed through `sanitizeText`.
 * @returns An array of string tokens.
 */
export function tokenize(sanitizedText: string): string[] {
  if (!sanitizedText) return [];

  const words = sanitizedText.split(' ');

  // Filter out stop-words and empty strings
  return words.filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/**
 * Pipeline function that executes both sanitization and tokenization
 * in a single step.
 *
 * @param rawText The raw input string.
 * @returns An array of valid, normalized tokens.
 */
export function processText(rawText: string): string[] {
  const sanitized = sanitizeText(rawText);
  return tokenize(sanitized);
}
