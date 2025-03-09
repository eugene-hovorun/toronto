import type { Subtitle, SpeakerSpeech } from "~/types";
/**
 * Parses an SRT file content into structured subtitle data
 * This is a backup in case the 'subtitle' package is not available
 *
 * @param srtContent - The content of an SRT file
 * @returns Array of subtitle objects with start, end, and text properties
 */
export function parseSRT(srtContent: string): Subtitle[] {
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
    const startHours: number = parseInt(timingMatch[1]);
    const startMinutes: number = parseInt(timingMatch[2]);
    const startSeconds: number = parseInt(timingMatch[3]);
    const startMilliseconds: number = parseInt(timingMatch[4]);

    const endHours: number = parseInt(timingMatch[5]);
    const endMinutes: number = parseInt(timingMatch[6]);
    const endSeconds: number = parseInt(timingMatch[7]);
    const endMilliseconds: number = parseInt(timingMatch[8]);

    const startTime: number =
      startHours * 3600 +
      startMinutes * 60 +
      startSeconds +
      startMilliseconds / 1000;
    const endTime: number =
      endHours * 3600 + endMinutes * 60 + endSeconds + endMilliseconds / 1000;

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
export function extractSpeakerAndSpeech(text: string): SpeakerSpeech | null {
  const match: RegExpMatchArray | null = text.match(/\[([^\]]+)\](.*)/i);

  if (!match) return null;

  return {
    speaker: match[1].trim(),
    speech: match[2].trim(),
  };
}
