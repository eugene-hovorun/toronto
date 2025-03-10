import { parseSRT } from "~/utils";
import { H3Event } from "h3";
import type { WordAnalysisData, VideoMetadata } from "~/types";
import { join } from "path";
import fs from "fs";

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
    // Use a hybrid approach that works in both development and production
    console.log(`Environment: ${process.env.NODE_ENV}`);

    // Define possible strategies with fallbacks
    let episodeDirs: string[] = [];
    let isServerless = false;

    // Strategy 1: Try using fs/promises (works in development)
    if (!episodeDirs.length) {
      try {
        const { readdir } = await import("fs/promises");

        // Define paths to check - in order of preference
        const basePaths = [
          "./server/assets/episodes",
          "./public/episodes",
          "./assets/episodes",
        ];

        // Log current directory structure for debugging
        try {
          const currentDirFiles = await readdir(".");
          console.log("Root directory:", currentDirFiles);
        } catch (err) {
          console.log("Cannot read current directory");
        }

        // Find episode directories
        for (const path of basePaths) {
          try {
            console.log(`Checking for episodes in ${path}`);
            const dirs = await readdir(path);

            // Filter for episode date directories (format: YYYY-MM-DD)
            const validDirs = dirs.filter((dir) =>
              /^\d{4}-\d{2}-\d{2}$/.test(dir)
            );

            if (validDirs.length > 0) {
              episodeDirs = validDirs;
              console.log(
                `Found ${validDirs.length} episode directories in ${path} using fs`
              );

              // Process each episode (development mode with direct file access)
              for (const episodeDate of episodeDirs) {
                try {
                  const { readFile } = await import("fs/promises");

                  // Construct full file paths
                  const srtPath = `${path}/${episodeDate}/${episodeDate}.srt`;
                  const jsonPath = `${path}/${episodeDate}/${episodeDate}.json`;

                  console.log(`Trying to read SRT from: ${srtPath}`);

                  // Read SRT file
                  let srtContent: string | null = null;
                  try {
                    srtContent = await readFile(srtPath, "utf8");
                    console.log(`Successfully read SRT file from ${srtPath}`);
                  } catch (error) {
                    console.warn(`Could not read SRT file from ${srtPath}`);
                    continue;
                  }

                  // Read JSON metadata file
                  let metadata: VideoMetadata | null = null;
                  try {
                    const jsonContent = await readFile(jsonPath, "utf8");
                    metadata = JSON.parse(jsonContent);
                    console.log(`Successfully read JSON file from ${jsonPath}`);
                  } catch (error) {
                    console.warn(`Could not read JSON file from ${jsonPath}`);
                    continue;
                  }

                  console.log(`Processing episode ${episodeDate}`);

                  // Process this episode
                  const subtitles = parseSRT(srtContent);
                  await processEpisode(
                    result,
                    episodeDate,
                    subtitles,
                    metadata!,
                    searchTerm
                  );
                } catch (error) {
                  console.error(
                    `Error processing episode ${episodeDate}:`,
                    error
                  );
                }
              }

              // Return the result if we successfully processed episodes
              if (result.episodes.length > 0) {
                return result;
              }

              break;
            }
          } catch (error) {
            console.log(`Error checking ${path}:`, error);
          }
        }
      } catch (err) {
        console.log("fs/promises approach failed, trying serverless approach");
        isServerless = true;
      }
    }

    // Strategy 2: Try $fetch API (works in Vercel serverless)
    if (!result.episodes.length || isServerless) {
      console.log("Trying serverless/HTTP approach");

      try {
        // For Vercel, try accessing files via HTTP paths
        // This works if files are in the public directory

        // Defined hardcoded list of known episodes (best approach for serverless)
        // TODO: In production, this list should be fetched from an API or defined in your code
        const knownEpisodes = ["2023-01-01", "2023-01-15", "2023-02-01"];
        episodeDirs = knownEpisodes;

        console.log(
          `Using ${episodeDirs.length} known episodes for serverless`
        );

        // Process each episode (serverless mode with fetch)
        for (const episodeDate of episodeDirs) {
          try {
            // Try to fetch the files from public URLs
            // This works if your files are in the public directory
            const srtUrl = `/episodes/${episodeDate}/${episodeDate}.srt`;
            const jsonUrl = `/episodes/${episodeDate}/${episodeDate}.json`;

            console.log(`Trying to fetch SRT from: ${srtUrl}`);

            // Fetch SRT file
            let srtContent: string | null = null;
            try {
              const srtResponse = await $fetch(srtUrl, {
                responseType: "text",
              });
              if (srtResponse) {
                srtContent = srtResponse.toString();
                console.log(`Successfully fetched SRT file from ${srtUrl}`);
              }
            } catch (error) {
              console.warn(`Could not fetch SRT file from ${srtUrl}`);
              continue;
            }

            // Fetch JSON metadata file
            let metadata: VideoMetadata | null = null;
            try {
              metadata = await $fetch(jsonUrl);
              console.log(`Successfully fetched JSON file from ${jsonUrl}`);
            } catch (error) {
              console.warn(`Could not fetch JSON file from ${jsonUrl}`);
              continue;
            }

            if (srtContent && metadata) {
              console.log(`Processing episode ${episodeDate}`);

              // Process this episode
              const subtitles = parseSRT(srtContent);
              await processEpisode(
                result,
                episodeDate,
                subtitles,
                metadata,
                searchTerm
              );
            }
          } catch (error) {
            console.error(`Error processing episode ${episodeDate}:`, error);
          }
        }

        // If we've processed episodes, return the result
        if (result.episodes.length > 0) {
          return result;
        }
      } catch (err) {
        console.log("Serverless approach failed:", err);
      }
    }

    // Strategy 3: Use Nuxt's useStorage as last resort
    if (!result.episodes.length) {
      console.log("Trying useStorage approach");

      try {
        // Try using Nitro's storage API
        const storage = useStorage();

        // List of predefined episodes to check
        const predefinedEpisodes = ["2023-01-01", "2023-01-15", "2023-02-01"];
        episodeDirs = predefinedEpisodes;

        // Possible base paths for storage
        const storagePaths = [
          "server:assets/episodes/",
          "public:episodes/",
          "assets:episodes/",
        ];

        // Process each episode (using storage API)
        for (const episodeDate of episodeDirs) {
          for (const storagePath of storagePaths) {
            try {
              // Try to get files using storage API
              const srtKey = `${storagePath}${episodeDate}/${episodeDate}.srt`;
              const jsonKey = `${storagePath}${episodeDate}/${episodeDate}.json`;

              console.log(`Trying to read SRT from storage: ${srtKey}`);

              // Get SRT file
              let srtContent: string | null = null;
              try {
                srtContent = await storage.getItem<string>(srtKey);
                if (srtContent) {
                  console.log(
                    `Successfully read SRT file from storage: ${srtKey}`
                  );
                }
              } catch (error) {
                console.warn(`Could not read SRT file from storage: ${srtKey}`);
                continue;
              }

              // Get JSON metadata file
              let metadata: VideoMetadata | null = null;
              try {
                metadata = await storage.getItem<VideoMetadata>(jsonKey);
                if (metadata) {
                  console.log(
                    `Successfully read JSON file from storage: ${jsonKey}`
                  );
                }
              } catch (error) {
                console.warn(
                  `Could not read JSON file from storage: ${jsonKey}`
                );
                continue;
              }

              if (srtContent && metadata) {
                console.log(`Processing episode ${episodeDate}`);

                // Process this episode
                const subtitles = parseSRT(srtContent);
                await processEpisode(
                  result,
                  episodeDate,
                  subtitles,
                  metadata,
                  searchTerm
                );

                // Break out of storage path loop since we found this episode
                break;
              }
            } catch (error) {
              console.error(
                `Error with storage path ${storagePath} for episode ${episodeDate}:`,
                error
              );
            }
          }
        }
      } catch (err) {
        console.log("useStorage approach failed:", err);
      }
    }

    // Return the result after trying all strategies
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
