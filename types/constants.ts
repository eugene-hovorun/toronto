/**
 * Application constants for word analysis functionality
 */

/**
 * List of valid speakers to include in the analysis
 */
export const VALID_SPEAKERS = ["Максим", "Олександра", "Аліна"];

/**
 * Minimum context length (in characters) considered meaningful
 */
export const MIN_CONTEXT_LENGTH = 30;

/**
 * Maximum number of context examples to include in results
 */
export const MAX_CONTEXT_EXAMPLES = 20;

/**
 * Timeout for word analysis in milliseconds
 */
export const ANALYSIS_TIMEOUT_MS = 15000;

/**
 * Maximum time gap (in seconds) between subtitles to be considered continuous context
 */
export const MAX_CONTEXT_TIME_GAP = 10;

/**
 * Common words used for quick analysis
 */
export const COMMON_WORDS = [
  "Україна",
  "війна",
  "донат",
  "потік",
  "збір",
  "кастомний",
  "сатана",
] as const;

/**
 * Type for common words
 */
export type CommonWord = (typeof COMMON_WORDS)[number];
