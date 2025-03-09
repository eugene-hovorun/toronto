import type { WordAnalysisData } from "~/types";

/**
 * Configuration options for API requests
 */
interface ApiOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to cache results */
  cache?: boolean;
}

/**
 * Default API options
 */
const DEFAULT_OPTIONS: ApiOptions = {
  timeout: 10000,
  cache: true,
};

/**
 * In-memory cache for API responses
 */
const apiCache = new Map<
  string,
  { data: WordAnalysisData; timestamp: number }
>();

/**
 * API service for word analysis
 */
export const wordAnalysisAPI = {
  /**
   * Fetches word analysis data from the API
   * @param word - Word to analyze
   * @param options - API request options
   * @returns Promise with word analysis data
   */
  async fetchWordData(
    word: string,
    options: ApiOptions = DEFAULT_OPTIONS
  ): Promise<WordAnalysisData> {
    if (!word || word.trim() === "") {
      throw new Error("Word parameter is required");
    }

    const trimmedWord = word.trim();
    const cacheKey = `word_${trimmedWord}`;

    // Check cache if enabled
    if (options.cache) {
      const cachedData = apiCache.get(cacheKey);
      // Cache is valid for 1 hour
      if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
        return cachedData.data;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout || DEFAULT_OPTIONS.timeout
      );

      const response = await fetch(
        `/api/word-analysis?word=${encodeURIComponent(trimmedWord)}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as WordAnalysisData;

      if (data.error) {
        throw new Error(data.error);
      }

      // Cache the result if caching is enabled
      if (options.cache) {
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (err) {
      // Clean up and rethrow
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Failed to fetch word data");
    }
  },

  /**
   * Clears the API cache
   */
  clearCache(): void {
    apiCache.clear();
  },

  /**
   * Gets raw API URL for a word
   * @param word - Word to analyze
   * @returns Raw API URL
   */
  getApiUrl(word: string): string {
    return `/api/word-analysis?word=${encodeURIComponent(word.trim())}`;
  },
};
