import { sanitizeText, processText } from './sanitizer';

/**
 * Calculates the Jaccard Similarity index between two sets of tokens.
 *
 * The Jaccard index is defined as the size of the intersection divided by the size of the union
 * of the sample sets.
 * J(A,B) = |A ∩ B| / |A ∪ B|
 *
 * @param tokensA The first array of tokens (e.g., search query).
 * @param tokensB The second array of tokens (e.g., database quote).
 * @returns A float between 0.0 (no similarity) and 1.0 (exact match).
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  // Utilize Set for mathematical intersection
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionSize = 0;

  // Calculate the intersection size (A ∩ B)
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  // The union size is the sum of sizes minus the intersection size (A ∪ B)
  const unionSize = setA.size + setB.size - intersectionSize;

  // Prevent division by zero
  if (unionSize === 0) return 0.0;

  return intersectionSize / unionSize;
}

/**
 * Calculates the Jaccard Similarity index between two strings using bigrams.
 */
export function calculateJaccardStringSimilarity(strA: string, strB: string): number {
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

  const setA = new Set(bigramsA);
  const setB = new Set(bigramsB);

  let intersectionSize = 0;
  for (const bigram of setA) {
    if (setB.has(bigram)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  if (unionSize === 0) return 0.0;

  return intersectionSize / unionSize;
}

/**
 * Calculates a fuzzy match score between a search query and a target text using Jaccard index.
 */
export function calculateJaccardFuzzyMatchScore(query: string, targetText: string): number {
  const queryTokens = processText(query);
  const targetTokens = processText(targetText);

  if (queryTokens.length === 0) return 0.0;
  if (targetTokens.length === 0) return 0.0;

  let totalScore = 0;

  for (const qToken of queryTokens) {
    let maxTokenScore = 0;
    for (const tToken of targetTokens) {
      const score = calculateJaccardStringSimilarity(qToken, tToken);
      if (score > maxTokenScore) {
        maxTokenScore = score;
      }
    }
    totalScore += maxTokenScore;
  }

  const baseScore = totalScore / queryTokens.length;

  const extraWords = Math.max(0, targetTokens.length - queryTokens.length);
  const penalty = Math.min(0.1, extraWords * 0.005);

  return Math.max(0.0, baseScore - penalty);
}
