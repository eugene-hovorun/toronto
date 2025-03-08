/**
 * Parses an SRT file content into structured subtitle data
 * This is a backup in case the 'subtitle' package is not available
 *
 * @param {string} srtContent - The content of an SRT file
 * @returns {Array} - Array of subtitle objects with start, end, and text properties
 */
export function parseSRT(srtContent) {
  // Split the content by double newline to get individual subtitle blocks
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  const subtitles = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);

    // Skip blocks that don't have at least 3 lines (index, timing, text)
    if (lines.length < 3) continue;

    // Parse the timing line (second line)
    const timingMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );

    if (!timingMatch) continue;

    // Calculate start and end times in seconds
    const startHours = parseInt(timingMatch[1]);
    const startMinutes = parseInt(timingMatch[2]);
    const startSeconds = parseInt(timingMatch[3]);
    const startMilliseconds = parseInt(timingMatch[4]);

    const endHours = parseInt(timingMatch[5]);
    const endMinutes = parseInt(timingMatch[6]);
    const endSeconds = parseInt(timingMatch[7]);
    const endMilliseconds = parseInt(timingMatch[8]);

    const startTime =
      startHours * 3600 +
      startMinutes * 60 +
      startSeconds +
      startMilliseconds / 1000;
    const endTime =
      endHours * 3600 + endMinutes * 60 + endSeconds + endMilliseconds / 1000;

    // Combine the remaining lines as the text content
    const text = lines.slice(2).join("\n");

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
 * @param {string} text - Subtitle text line
 * @returns {Object|null} - Object with speaker and speech properties, or null if no speaker found
 */
export function extractSpeakerAndSpeech(text) {
  const match = text.match(/\[([^\]]+)\](.*)/i);

  if (!match) return null;

  return {
    speaker: match[1].trim(),
    speech: match[2].trim(),
  };
}
