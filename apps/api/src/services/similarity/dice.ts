import { sanitizeText, processText } from './sanitizer';

/**
 * Calculates the Sørensen-Dice similarity coefficient between two strings
 * using bigrams (letter-pairs). This is highly effective for fuzzy string
 * matching and handling typographical errors or partial matches.
 *
 * @param strA The first raw string.
 * @param strB The second raw string.
 * @returns A float between 0.0 (no similarity) and 1.0 (exact match).
 */
export function calculateDiceSimilarity(strA: string, strB: string): number {
  const cleanA = sanitizeText(strA).replace(/\s+/g, '');
  const cleanB = sanitizeText(strB).replace(/\s+/g, '');

  if (cleanA === cleanB) return 1.0;
  if (cleanA.length < 2 || cleanB.length < 2) return 0.0;

  const getBigrams = (str: string): string[] => {
    const bigrams: string[] = [];
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(cleanA);
  const bigramsB = getBigrams(cleanB);

  const mapA = new Map<string, number>();
  for (const bigram of bigramsA) {
    mapA.set(bigram, (mapA.get(bigram) || 0) + 1);
  }

  let intersectionSize = 0;
  for (const bigram of bigramsB) {
    const count = mapA.get(bigram) || 0;
    if (count > 0) {
      intersectionSize++;
      mapA.set(bigram, count - 1);
    }
  }

  return (2 * intersectionSize) / (bigramsA.length + bigramsB.length);
}

/**
 * Calculates the token-based (word-level) Sørensen-Dice similarity between two arrays of tokens.
 *
 * @param tokensA The first array of tokens.
 * @param tokensB The second array of tokens.
 * @returns A float between 0.0 (no similarity) and 1.0 (exact match).
 */
export function calculateTokenDiceSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  return (2 * intersectionSize) / (setA.size + setB.size);
}

/**
 * Calculates a fuzzy match score between a search query and a target text.
 * It tokenizes both query and target, finds the best Sørensen-Dice similarity
 * for each query token against the target tokens, and returns the average
 * with a subtle density penalty for extra words to act as a natural tie-breaker.
 *
 * @param query The search query.
 * @param targetText The text to search within.
 * @returns A float between 0.0 (no similarity) and 1.0 (exact match).
 */
export function calculateFuzzyMatchScore(query: string, targetText: string): number {
  const queryTokens = processText(query);
  const targetTokens = processText(targetText);

  if (queryTokens.length === 0) return 0.0;
  if (targetTokens.length === 0) return 0.0;

  let totalScore = 0;

  for (const qToken of queryTokens) {
    let maxTokenScore = 0;
    for (const tToken of targetTokens) {
      const score = calculateDiceSimilarity(qToken, tToken);
      if (score > maxTokenScore) {
        maxTokenScore = score;
      }
    }
    totalScore += maxTokenScore;
  }

  const baseScore = totalScore / queryTokens.length;

  // Apply a subtle density penalty based on extra words in target to act as a natural tie-breaker.
  // We subtract 0.005 for each extra word, capped at a maximum 10% (0.10) penalty.
  const extraWords = Math.max(0, targetTokens.length - queryTokens.length);
  const penalty = Math.min(0.1, extraWords * 0.005);

  return Math.max(0.0, baseScore - penalty);
}
