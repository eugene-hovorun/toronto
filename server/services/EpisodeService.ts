import { Buffer } from "buffer";
import type { VideoMetadata, Episode } from "~/types";

/**
 * Interface for the Nuxt storage driver
 */
interface StorageDriver {
  getItem<T>(key: string): Promise<T | null>;
  getKeys(): Promise<string[]>;
  hasItem(key: string): Promise<boolean>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Service for managing episode data and metadata
 */
export class EpisodeService {
  private storage: StorageDriver;

  constructor() {
    // Initialize storage access
    this.storage = useStorage("assets:server") as StorageDriver;
  }

  /**
   * Gets a list of all available unique episode dates
   *
   * @returns Array of episode dates (YYYY-MM-DD format)
   */
  public async getEpisodeDates(): Promise<string[]> {
    try {
      // Get list of all episode files
      const episodeFiles = await this.storage.getKeys();

      // Extract unique episode dates from the file paths
      // Format example: 'episodes:2024-07-24:2024-07-24.json'
      const episodeDates = episodeFiles
        .map((key: string) => {
          const match = key.match(/episodes:(\d{4}-\d{2}-\d{2}):/);
          return match ? match[1] : null;
        })
        .filter((date: string | null): date is string => date !== null);

      // Get unique episode dates
      const uniqueEpisodeDates = [...new Set(episodeDates)];

      return uniqueEpisodeDates;
    } catch (error) {
      console.error("Error getting episode dates:", error);
      return [];
    }
  }

  /**
   * Gets SRT content for a specific episode date
   *
   * @param episodeDate - Date of the episode in YYYY-MM-DD format
   * @returns SRT content as string, or null if not found
   */
  public async getEpisodeSrt(episodeDate: string): Promise<string | null> {
    try {
      // Construct storage key for SRT file
      const srtKey = `episodes:${episodeDate}:${episodeDate}.srt`;

      // Read SRT file
      let srtContent = await this.storage.getItem(srtKey);
      if (!srtContent) {
        console.warn(`Could not read SRT file for ${episodeDate}`);
        return null;
      }

      // Convert Buffer/Uint8Array to string if needed
      if (srtContent instanceof Uint8Array || Buffer.isBuffer(srtContent)) {
        srtContent = new TextDecoder().decode(srtContent);
      } else if (typeof srtContent !== "string") {
        // If it's not a string or buffer, try to convert it
        srtContent = String(srtContent);
      }

      return srtContent as string;
    } catch (error) {
      console.error(`Error reading SRT for episode ${episodeDate}:`, error);
      return null;
    }
  }

  /**
   * Gets metadata for a specific episode date
   *
   * @param episodeDate - Date of the episode in YYYY-MM-DD format
   * @returns Episode metadata, or null if not found
   */
  public async getEpisodeMetadata(
    episodeDate: string
  ): Promise<VideoMetadata | null> {
    try {
      // Construct storage key for JSON metadata file
      const jsonKey = `episodes:${episodeDate}:${episodeDate}.json`;

      // Read JSON metadata file
      const metadata = await this.storage.getItem<VideoMetadata>(jsonKey);
      if (!metadata) {
        console.warn(`Could not read metadata for ${episodeDate}`);
        return null;
      }

      return metadata;
    } catch (error) {
      console.error(
        `Error reading metadata for episode ${episodeDate}:`,
        error
      );
      return null;
    }
  }

  /**
   * Sorts episodes by date
   *
   * @param episodes - Array of episodes to sort
   * @returns Sorted array of episodes
   */
  public sortEpisodesByDate(episodes: Episode[]): Episode[] {
    return [...episodes].sort((a, b) => a.date.localeCompare(b.date));
  }
}
