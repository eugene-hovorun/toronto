import { parseSRT } from "~/utils";
import { H3Event } from "h3";
import type { WordAnalysisData, VideoMetadata } from "~/types";

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
 * Improved function to access episode data from server assets
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
    // Use Node.js fs module to read directories
    // This approach works better for local development and in serverless environments

    // Get actual server runtime config to find base directory
    const config = useRuntimeConfig();
    console.log("Runtime config available:", !!config);

    // Define paths to check - in order of preference
    const basePaths = [
      "./server/assets/episodes", // Standard Nuxt 3 server directory
      "./public/episodes", // Public directory
      "./assets/episodes", // Another common location
    ];

    // Debug: Log current directory
    console.log("Current directory structure:");
    try {
      const { readdir } = await import("fs/promises");
      const currentDirFiles = await readdir(".");
      console.log("Root directory:", currentDirFiles);

      // Try to see what's in the server directory if it exists
      if (currentDirFiles.includes("server")) {
        const serverFiles = await readdir("./server");
        console.log("Server directory:", serverFiles);

        if (serverFiles.includes("assets")) {
          const assetsFiles = await readdir("./server/assets");
          console.log("Server assets directory:", assetsFiles);
        }
      }
    } catch (error) {
      console.log("Error reading directories:", error);
    }

    // Find all episode directories
    let episodeDirs: string[] = [];
    let basePath = "";

    for (const path of basePaths) {
      try {
        const { readdir } = await import("fs/promises");
        console.log(`Checking for episodes in ${path}`);

        // Try to read the directory
        let dirs: string[] = [];
        try {
          dirs = await readdir(path);
          console.log(`Found in ${path}:`, dirs);
        } catch (error) {
          console.log(`Could not read ${path}`);
          continue;
        }

        // Filter for episode date directories (format: YYYY-MM-DD)
        const validDirs = dirs.filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir));

        if (validDirs.length > 0) {
          episodeDirs = validDirs;
          basePath = path;
          console.log(
            `Found ${validDirs.length} episode directories in ${path}`
          );
          break;
        }
      } catch (error) {
        console.log(`Error checking ${path}:`, error);
      }
    }

    // Sort by date (newest first)
    episodeDirs.sort((a, b) => b.localeCompare(a));
    console.log(`Processing ${episodeDirs.length} episode directories`);

    // Fallback to hardcoded list if no episodes found
    if (episodeDirs.length === 0) {
      console.warn(
        "No episode directories found. Using fallback sample episodes list."
      );
      episodeDirs = ["2023-01-01", "2023-01-15"]; // Example fallback

      // Try to detect which basePath might work for reading files
      for (const path of basePaths) {
        try {
          const { access } = await import("fs/promises");
          await access(path);
          basePath = path;
          console.log(`Using fallback path: ${basePath}`);
          break;
        } catch (error) {
          // Path not accessible
        }
      }

      // If still no valid path, default to the first one
      if (!basePath) {
        basePath = basePaths[0];
        console.log(`Defaulting to path: ${basePath}`);
      }
    }

    // Process each episode
    for (const episodeDate of episodeDirs) {
      try {
        // Use Node fs directly instead of Nitro storage
        const { readFile } = await import("fs/promises");

        // Construct full file paths
        const srtPath = `${basePath}/${episodeDate}/${episodeDate}.srt`;
        const jsonPath = `${basePath}/${episodeDate}/${episodeDate}.json`;

        console.log(`Trying to read SRT from: ${srtPath}`);
        console.log(`Trying to read JSON from: ${jsonPath}`);

        // Read SRT file
        let srtContent: string | null = null;
        try {
          srtContent = await readFile(srtPath, "utf8");
          console.log(`Successfully read SRT file from ${srtPath}`);
        } catch (error) {
          console.warn(`Could not read SRT file from ${srtPath}:`, error);
          continue;
        }

        // Read JSON metadata file
        let metadata: VideoMetadata | null = null;
        try {
          const jsonContent = await readFile(jsonPath, "utf8");
          metadata = JSON.parse(jsonContent);
          console.log(`Successfully read JSON file from ${jsonPath}`);
        } catch (error) {
          console.warn(`Could not read JSON file from ${jsonPath}:`, error);
          continue;
        }

        console.log(`Processing episode ${episodeDate}`);

        // Parse the SRT content
        const subtitles = parseSRT(srtContent);

        // Process this episode
        await processEpisode(
          result,
          episodeDate,
          subtitles,
          metadata!,
          searchTerm
        );
      } catch (error) {
        console.error(`Error processing episode ${episodeDate}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error accessing server assets:", error);
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
