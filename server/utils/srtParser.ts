import type { Subtitle, SpeakerSpeech } from "~/types";

/**
 * Utility class for handling SRT subtitle files
 */
export class SrtParser {
  /**
   * Parses an SRT file content into structured subtitle data
   * This is a backup in case the 'subtitle' package is not available
   *
   * @param srtContent - The content of an SRT file
   * @returns Array of subtitle objects with start, end, and text properties
   */
  public static parse(srtContent: string): Subtitle[] {
    console.log("srtContent type: ", typeof srtContent);

    // Split the content by double newline to get individual subtitle blocks
    const blocks: string[] = srtContent.trim().split(/\r?\n\r?\n/);
    const subtitles: Subtitle[] = [];

    for (const block of blocks) {
      const lines: string[] = block.split(/\r?\n/);

      // Skip blocks that don't have at least 3 lines (index, timing, text)
      if (lines.length < 3) continue;

      // Parse the timing line (second line)
      const timingMatch: RegExpMatchArray | null = lines[1].match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );

      if (!timingMatch) continue;

      // Calculate start and end times in seconds
      const startTime: number = this.calculateTimeInSeconds(
        parseInt(timingMatch[1]), // hours
        parseInt(timingMatch[2]), // minutes
        parseInt(timingMatch[3]), // seconds
        parseInt(timingMatch[4]) // milliseconds
      );

      const endTime: number = this.calculateTimeInSeconds(
        parseInt(timingMatch[5]), // hours
        parseInt(timingMatch[6]), // minutes
        parseInt(timingMatch[7]), // seconds
        parseInt(timingMatch[8]) // milliseconds
      );

      // Combine the remaining lines as the text content
      const text: string = lines.slice(2).join("\n");

      subtitles.push({
        start: startTime,
        end: endTime,
        text,
      });
    }

    return subtitles;
  }

  /**
   * Extracts the speaker and speech from a subtitle text line
   *
   * @param text - Subtitle text line
   * @returns Object with speaker and speech properties, or null if no speaker found
   */
  public static extractSpeakerAndSpeech(text: string): SpeakerSpeech | null {
    const match: RegExpMatchArray | null = text.match(/\[([^\]]+)\](.*)/i);

    if (!match) return null;

    return {
      speaker: match[1].trim(),
      speech: match[2].trim(),
    };
  }

  /**
   * Calculates time in seconds from hours, minutes, seconds, and milliseconds
   *
   * @param hours - Hours component
   * @param minutes - Minutes component
   * @param seconds - Seconds component
   * @param milliseconds - Milliseconds component
   * @returns Time in seconds
   */
  private static calculateTimeInSeconds(
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
  ): number {
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }
}
