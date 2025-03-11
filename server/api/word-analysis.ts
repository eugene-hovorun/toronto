import { parseSRT } from "~/utils";
import { H3Event } from "h3";
import type { WordAnalysisData, VideoMetadata } from "~/types";
import { Buffer } from "buffer";

// List of valid speakers to include in the analysis
const VALID_SPEAKERS = ["Максим", "Олександра", "Аліна"];

// Minimum context length (in characters) considered meaningful
const MIN_CONTEXT_LENGTH = 30;

// Helper functions
function isValidContext(text: string, searchTerm: string): boolean {
  if (!text) return false;
  if (text.length < 10) return false;
  const textWithoutSearchTerm = text
    .toLowerCase()
    .replace(new RegExp(searchTerm, "gi"), "")
    .trim();
  const wordCount = textWithoutSearchTerm
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  return wordCount >= 3;
}

function formatYouTubeTimestamp(seconds: number): number {
  return Math.floor(seconds);
}

function extractSpeakerAndText(
  text: string
): { speaker: string; text: string } | null {
  const match = text.match(/\[([^\]]+)\](.*)/i);
  if (!match) return null;
  return {
    speaker: match[1].trim(),
    text: match[2].trim(),
  };
}

function extendContext(
  subtitles: any[],
  currentIndex: number,
  maxSubtitles: number = 2
): string {
  let context = "";
  let subtitlesAdded = 0;
  let speaker = "";

  const currentSubtitleInfo = extractSpeakerAndText(
    subtitles[currentIndex].text
  );
  if (currentSubtitleInfo) {
    speaker = currentSubtitleInfo.speaker;
  }

  if (currentSubtitleInfo) {
    context = currentSubtitleInfo.text;
  } else {
    context = subtitles[currentIndex].text;
  }

  let forwardIndex = currentIndex + 1;
  while (
    forwardIndex < subtitles.length &&
    subtitlesAdded < maxSubtitles &&
    subtitles[forwardIndex].start <= subtitles[currentIndex].start + 10
  ) {
    const nextSubtitleInfo = extractSpeakerAndText(
      subtitles[forwardIndex].text
    );
    if (nextSubtitleInfo && nextSubtitleInfo.speaker === speaker) {
      context += " " + nextSubtitleInfo.text;
      subtitlesAdded++;
    }
    forwardIndex++;
  }

  let backwardIndex = currentIndex - 1;
  while (
    backwardIndex >= 0 &&
    subtitlesAdded < maxSubtitles &&
    subtitles[currentIndex].start - subtitles[backwardIndex].end <= 10
  ) {
    const prevSubtitleInfo = extractSpeakerAndText(
      subtitles[backwardIndex].text
    );
    if (prevSubtitleInfo && prevSubtitleInfo.speaker === speaker) {
      context = prevSubtitleInfo.text + " " + context;
      subtitlesAdded++;
    }
    backwardIndex--;
  }

  return context;
}

/**
 * Access episode data from server assets using the useStorage API, which is Nuxt's recommended approach
 */
async function getEpisodeData(searchTerm: string): Promise<WordAnalysisData> {
  const result: WordAnalysisData = {
    word: searchTerm,
    totalCount: 0,
    episodes: [],
    speakers: {},
    contexts: [],
  };

  try {
    // Use Nuxt's storage API to access server assets
    const storage = useStorage("assets:server");
    console.log("Using Nuxt storage API to access episodes");

    // Get list of all episodes
    const episodeFiles = await storage.getKeys();
    console.log("Available episode files:", episodeFiles);

    // Extract unique episode dates from the file paths
    // Format example: 'episodes:2024-07-24:2024-07-24.json'
    const episodeDates = episodeFiles
      .map((key) => {
        const match = key.match(/episodes:(\d{4}-\d{2}-\d{2}):/);
        return match ? match[1] : null;
      })
      .filter((date): date is string => date !== null);

    // Get unique episode dates
    const uniqueEpisodeDates = [...new Set(episodeDates)];
    console.log(`Found ${uniqueEpisodeDates.length} unique episode dates`);

    // Process each episode
    for (const episodeDate of uniqueEpisodeDates) {
      try {
        // Construct storage keys for SRT and JSON files using the correct format
        const srtKey = `episodes:${episodeDate}:${episodeDate}.srt`;
        const jsonKey = `episodes:${episodeDate}:${episodeDate}.json`;

        console.log(`Trying to read SRT from: ${srtKey}`);

        // Read SRT file
        let srtContent = await storage.getItem(srtKey);
        if (!srtContent) {
          console.warn(`Could not read SRT file for ${episodeDate}`);
          continue;
        }

        // Convert Buffer/Uint8Array to string if needed
        if (srtContent instanceof Uint8Array || Buffer.isBuffer(srtContent)) {
          srtContent = new TextDecoder().decode(srtContent);
        } else if (typeof srtContent !== "string") {
          // If it's not a string or buffer, try to convert it
          srtContent = String(srtContent);
        }

        console.log(`Successfully read SRT file for ${episodeDate}`);

        // Read JSON metadata file
        const metadata = await storage.getItem<VideoMetadata>(jsonKey);
        if (!metadata) {
          console.warn(`Could not read metadata for ${episodeDate}`);
          continue;
        }
        console.log(`Successfully read metadata for ${episodeDate}`);

        // Process this episode
        const subtitles = parseSRT(srtContent);
        await processEpisode(
          result,
          episodeDate,
          subtitles,
          metadata,
          searchTerm
        );
      } catch (error) {
        console.error(`Error processing episode ${episodeDate}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error accessing episodes:", error);
    return result;
  }
}

/**
 * Shared logic for processing an episode
 */
async function processEpisode(
  result: WordAnalysisData,
  episodeDate: string,
  subtitles: any[],
  metadata: VideoMetadata,
  searchTerm: string
) {
  // Extract video ID from thumbnail URL
  const thumbnailUrl = metadata.thumbnails?.medium?.url || "";
  const videoIdMatch = thumbnailUrl.match(/\/vi\/([^\/]+)\//);
  const videoId = videoIdMatch ? videoIdMatch[1] : "";

  console.log(`Parsed ${subtitles.length} subtitle entries for ${episodeDate}`);

  let episodeCount = 0;

  // Process each subtitle entry
  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];

    // Parse the text content to extract speaker and speech
    const match = subtitle.text.match(/\[([^\]]+)\](.*)/i);

    if (!match) continue;

    const speaker = match[1].trim();
    const text = match[2].trim();

    // Skip if the speaker is not in our valid speakers list
    if (!VALID_SPEAKERS.includes(speaker)) continue;

    // Check if text contains our search term
    const textLower = text.toLowerCase();

    // Try different matching approaches to find the word
    // Use substring count (catches all occurrences including within words)
    let substrCount = 0;
    let pos = textLower.indexOf(searchTerm);
    while (pos !== -1) {
      substrCount++;
      pos = textLower.indexOf(searchTerm, pos + 1);
    }

    // Only log if we found a match to reduce log spam
    if (substrCount > 0) {
      console.log(
        `Found "${searchTerm}" ${substrCount} times in: "${textLower}"`
      );
    }

    // Use the substring approach for counting occurrences (more lenient)
    const occurrences = substrCount;

    if (occurrences > 0) {
      // Update total count
      result.totalCount += occurrences;
      episodeCount += occurrences;

      // Update speaker count
      result.speakers[speaker] = (result.speakers[speaker] || 0) + occurrences;

      // Add to contexts (limited to avoid too much data)
      if (result.contexts.length < 20) {
        // Check if we need to extend the context (if it's too short)
        let contextText = text;

        // If the context is too short, extend it with nearby subtitles
        if (contextText.length < MIN_CONTEXT_LENGTH) {
          contextText = extendContext(subtitles, i, 2);
        }

        // Only add if the context is valid and meaningful
        if (isValidContext(contextText, searchTerm)) {
          // Create YouTube link with timestamp
          const youtubeTimestamp = formatYouTubeTimestamp(subtitle.start);
          const youtubeLink = videoId
            ? `https://www.youtube.com/watch?v=${videoId}&t=${youtubeTimestamp}`
            : null;

          result.contexts.push({
            episode: episodeDate,
            time: subtitle.start,
            speaker,
            text: contextText,
            thumbnailUrl: thumbnailUrl,
            youtubeLink: youtubeLink,
          });
        }
      }
    }
  }

  // Only add episodes where the word was found
  if (episodeCount > 0) {
    result.episodes.push({
      date: episodeDate,
      count: episodeCount,
    });
    console.log(
      `Found ${episodeCount} occurrences of "${searchTerm}" in episode ${episodeDate}`
    );
  }
}

export default defineEventHandler(async (event: H3Event) => {
  console.log("Word analysis API called");
  const query = getQuery(event);

  try {
    const { word } = query as { word?: string };

    if (!word || typeof word !== "string" || word.trim() === "") {
      throw createError({
        statusCode: 400,
        statusMessage: "Word parameter is required",
      });
    }

    const searchTerm = word.trim().toLowerCase();
    console.log(`Processing search for term: "${searchTerm}"`);

    // Add a timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Analysis timed out after 15 seconds"));
      }, 15000);
    });

    // Use the improved asset access method
    const analysisPromise = getEpisodeData(searchTerm);

    // Race between analysis and timeout
    const finalResult = (await Promise.race([
      analysisPromise,
      timeoutPromise,
    ])) as WordAnalysisData;

    // Sort episodes by date (chronological order)
    finalResult.episodes.sort((a, b) => a.date.localeCompare(b.date));

    console.log(
      `Analysis complete for "${searchTerm}". Total occurrences: ${finalResult.totalCount}`
    );

    return finalResult;
  } catch (error: any) {
    console.error("Error analyzing word usage:", error);
    return {
      word: (query?.word as string) || "",
      totalCount: 0,
      episodes: [],
      speakers: {},
      contexts: [],
      error: error.message || "Error analyzing word usage",
    };
  }
});
