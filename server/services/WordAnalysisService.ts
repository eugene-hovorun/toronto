import { EpisodeService } from "./EpisodeService";
import { SubtitleService } from "./SubtitleService";
import type { WordAnalysisData, Context } from "~/types";

/**
 * Service for analyzing word usage across episodes
 */
export class WordAnalysisService {
  private episodeService: EpisodeService;
  private subtitleService: SubtitleService;

  constructor() {
    this.episodeService = new EpisodeService();
    this.subtitleService = new SubtitleService();
  }

  /**
   * Analyzes word usage across all available episodes
   *
   * @param searchTerm - Word to search for
   * @returns Analysis data including counts, episodes, speakers, and contexts
   */
  public async analyzeWordUsage(searchTerm: string): Promise<WordAnalysisData> {
    // Initialize result structure
    const result: WordAnalysisData = {
      word: searchTerm,
      totalCount: 0,
      episodes: [],
      speakers: {},
      contexts: [],
    };

    try {
      // Get all available episode dates
      const episodeDates = await this.episodeService.getEpisodeDates();

      // Process each episode
      for (const episodeDate of episodeDates) {
        const episodeResult = await this.analyzeEpisode(
          episodeDate,
          searchTerm
        );

        // Only include episodes where the word was found
        if (episodeResult && episodeResult.occurrenceCount > 0) {
          // Update total count
          result.totalCount += episodeResult.occurrenceCount;

          // Add episode data
          result.episodes.push({
            date: episodeDate,
            count: episodeResult.occurrenceCount,
          });

          // Update speaker counts
          for (const [speaker, count] of Object.entries(
            episodeResult.speakerCounts
          )) {
            result.speakers[speaker] = (result.speakers[speaker] || 0) + count;
          }

          // Add contexts (up to the maximum limit)
          const availableContextSlots = 20 - result.contexts.length;
          if (availableContextSlots > 0) {
            result.contexts.push(
              ...episodeResult.contexts.slice(0, availableContextSlots)
            );
          }

          console.log(
            `Found ${episodeResult.occurrenceCount} occurrences of "${searchTerm}" in episode ${episodeDate}`
          );
        }
      }

      // Sort episodes by date
      result.episodes = this.episodeService.sortEpisodesByDate(result.episodes);

      return result;
    } catch (error) {
      console.error("Error analyzing word usage:", error);
      throw error;
    }
  }

  /**
   * Analyzes a single episode for word occurrences
   *
   * @param episodeDate - Date of the episode to analyze
   * @param searchTerm - Word to search for
   * @returns Analysis data for the episode, or null if data is unavailable
   */
  private async analyzeEpisode(
    episodeDate: string,
    searchTerm: string
  ): Promise<{
    occurrenceCount: number;
    speakerCounts: Record<string, number>;
    contexts: Context[];
  } | null> {
    try {
      // Get episode SRT content
      const srtContent = await this.episodeService.getEpisodeSrt(episodeDate);
      if (!srtContent) return null;

      // Get episode metadata
      const metadata = await this.episodeService.getEpisodeMetadata(
        episodeDate
      );
      if (!metadata) return null;

      // Process subtitles to find word occurrences
      return this.subtitleService.processSubtitles(
        srtContent,
        searchTerm,
        episodeDate,
        metadata
      );
    } catch (error) {
      console.error(`Error analyzing episode ${episodeDate}:`, error);
      return null;
    }
  }
}
