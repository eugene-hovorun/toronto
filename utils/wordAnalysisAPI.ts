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
// Improve the caching in wordAnalysisAPI.ts:

/**
 * In-memory cache for API responses with request tracking
 */
const apiCache = new Map<
  string,
  { data: WordAnalysisData; timestamp: number }
>();

// Keep track of in-flight requests to prevent duplicates
const pendingRequests = new Map<string, Promise<WordAnalysisData>>();

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

    // Check for pending requests for the same word
    if (pendingRequests.has(cacheKey)) {
      console.log(`Using already in-flight request for "${trimmedWord}"`);
      return pendingRequests.get(cacheKey)!;
    }

    // Check cache if enabled
    if (options.cache) {
      const cachedData = apiCache.get(cacheKey);
      // Cache is valid for 1 hour
      if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
        console.log(`Using cached data for "${trimmedWord}"`);
        return cachedData.data;
      }
    }

    // Create the fetch request
    const fetchPromise = (async (): Promise<WordAnalysisData> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout || DEFAULT_OPTIONS.timeout
        );

        console.log(`Making API request for "${trimmedWord}"`);
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
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store the promise to handle parallel requests for the same word
    pendingRequests.set(cacheKey, fetchPromise);

    return fetchPromise;
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
