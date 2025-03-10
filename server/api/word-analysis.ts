// Improved to handle multiple file access methods
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { parseSRT } from "~/utils";
import { H3Event } from "h3";
import type { WordAnalysisData, VideoMetadata } from "~/types";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// List of valid speakers to include in the analysis
const VALID_SPEAKERS = ["Максим", "Олександра", "Аліна"];

// Minimum context length (in characters) considered meaningful
const MIN_CONTEXT_LENGTH = 30;

// Helper functions remain the same...
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
  // Implementation remains the same
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
 * Method 1: Try to access files using Nuxt's storage API
 */
async function getDataUsingStorageAPI(
  result: WordAnalysisData,
  searchTerm: string
) {
  console.log("Attempting to access files using Nuxt storage API");

  try {
    // Use Nuxt's storage API to access server assets
    const assets = useStorage("assets:server");

    // First, let's try to list all available keys to understand what's available
    const allKeys = await assets.getKeys();
    console.log(`Found ${allKeys.length} total keys in storage`);

    if (allKeys.length > 0) {
      console.log("Sample keys:", allKeys.slice(0, 3));
    }

    // Try different possible paths for episodes
    const possiblePaths = [
      "episodes",
      "",
      "assets/episodes",
      "server/assets/episodes",
    ];

    for (const basePath of possiblePaths) {
      try {
        console.log(`Trying base path: "${basePath}"`);

        // Filter keys that look like episode directories
        const episodePattern = new RegExp(
          `${basePath ? basePath + "/" : ""}(\\d{4}-\\d{2}-\\d{2})`
        );
        const episodeDirs = allKeys
          .filter((key) => episodePattern.test(key))
          .map((key) => {
            const match = key.match(/(\d{4}-\d{2}-\d{2})/);
            return match ? match[1] : null;
          })
          .filter((date): date is string => date !== null)
          // Remove duplicates
          .filter((date, index, self) => self.indexOf(date) === index);

        if (episodeDirs.length > 0) {
          console.log(
            `Found ${episodeDirs.length} episode directories using pattern ${episodePattern}`
          );

          // Sort directories by date (newest first)
          episodeDirs.sort((a, b) => b.localeCompare(a));

          // Process each episode
          for (const episodeDate of episodeDirs) {
            // Try different possible paths for SRT files
            const possibleSrtPaths = [
              `${
                basePath ? basePath + "/" : ""
              }${episodeDate}/${episodeDate}.srt`,
              `${basePath ? basePath + "/" : ""}${episodeDate}.srt`,
            ];

            let srtContent = null;
            let srtPath = null;

            for (const path of possibleSrtPaths) {
              if (await assets.hasItem(path)) {
                srtContent = (await assets.getItem(path)) as string;
                srtPath = path;
                break;
              }
            }

            if (!srtContent) {
              console.warn(`SRT file not found for episode ${episodeDate}`);
              continue;
            }

            // Try different possible paths for JSON files
            const possibleJsonPaths = [
              `${
                basePath ? basePath + "/" : ""
              }${episodeDate}/${episodeDate}.json`,
              `${basePath ? basePath + "/" : ""}${episodeDate}.json`,
            ];

            let jsonContent = null;

            for (const path of possibleJsonPaths) {
              if (await assets.hasItem(path)) {
                jsonContent = (await assets.getItem(path)) as string;
                break;
              }
            }

            if (!jsonContent) {
              console.warn(`JSON file not found for episode ${episodeDate}`);
              continue;
            }

            console.log(`Processing episode ${episodeDate} from ${srtPath}`);

            // Process the content
            const subtitles = parseSRT(srtContent);
            const metadata = JSON.parse(jsonContent) as VideoMetadata;

            // Process this episode using the standard logic
            await processEpisode(
              result,
              episodeDate,
              subtitles,
              metadata,
              searchTerm
            );
          }

          // If we processed at least one episode, return true
          if (result.episodes.length > 0) {
            return true;
          }
        }
      } catch (error) {
        console.error(`Error trying base path "${basePath}":`, error);
      }
    }

    return false;
  } catch (error) {
    console.error("Error using Nuxt storage API:", error);
    return false;
  }
}

/**
 * Method 2: Try to access files using Node.js fs
 */
async function getDataUsingNodeFS(
  result: WordAnalysisData,
  searchTerm: string
) {
  console.log("Attempting to access files using Node.js fs");

  try {
    // Try different possible locations for the assets
    const possiblePaths = [
      path.join(process.cwd(), "public", "assets"),
      path.join(process.cwd(), "server", "assets", "episodes"),
      path.join(process.cwd(), "server", "assets"),
      path.join(process.cwd(), "assets"),
      path.join(process.cwd(), ".output", "server", "assets"),
    ];

    for (const assetsDir of possiblePaths) {
      try {
        console.log(`Checking path: ${assetsDir}`);

        if (!fs.existsSync(assetsDir)) {
          console.log(`Path does not exist: ${assetsDir}`);
          continue;
        }

        // Get all subdirectories
        const entries = await readdir(assetsDir, { withFileTypes: true });
        const episodeDirs = entries
          .filter(
            (entry) =>
              entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
          )
          .map((entry) => entry.name);

        console.log(
          `Found ${episodeDirs.length} episode directories in ${assetsDir}`
        );

        if (episodeDirs.length === 0) continue;

        // Sort directories by date (newest first)
        episodeDirs.sort((a, b) => b.localeCompare(a));

        // Process each episode
        for (const episodeDir of episodeDirs) {
          const srtFilePath = path.join(
            assetsDir,
            episodeDir,
            `${episodeDir}.srt`
          );
          const jsonFilePath = path.join(
            assetsDir,
            episodeDir,
            `${episodeDir}.json`
          );

          if (!fs.existsSync(srtFilePath)) {
            console.warn(`SRT file not found: ${srtFilePath}`);
            continue;
          }

          if (!fs.existsSync(jsonFilePath)) {
            console.warn(`JSON file not found: ${jsonFilePath}`);
            continue;
          }

          console.log(`Processing files from ${srtFilePath}`);

          // Read and parse SRT file
          const srtContent = await readFile(srtFilePath, "utf-8");
          const subtitles = parseSRT(srtContent);

          // Read and parse JSON metadata file
          const jsonContent = await readFile(jsonFilePath, "utf-8");
          const metadata = JSON.parse(jsonContent) as VideoMetadata;

          // Process this episode using the standard logic
          await processEpisode(
            result,
            episodeDir,
            subtitles,
            metadata,
            searchTerm
          );
        }

        // If we processed at least one episode, return true
        if (result.episodes.length > 0) {
          return true;
        }
      } catch (error) {
        console.error(`Error checking path ${assetsDir}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error("Error using Node.js fs:", error);
    return false;
  }
}

/**
 * Method 3: Try to access files using fetch (URL-based approach)
 */
async function getDataUsingFetch(result: WordAnalysisData, searchTerm: string) {
  console.log("Attempting to access files using fetch");

  try {
    // Example dates to try (recent ones first)
    const possibleDates = [
      "2024-07-24",
      "2024-07-17",
      "2024-07-10",
      "2024-07-03",
      "2024-06-26",
      "2024-06-19",
      "2024-06-12",
      "2024-06-05",
      "2024-05-29",
      "2024-05-22",
      "2024-05-15",
      "2024-05-08",
    ];

    // Try to determine the base URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://potik.vercel.app";

    console.log(`Using base URL: ${baseUrl}`);

    // Try different possible path formats
    const pathFormats = [
      "/assets/$DATE/$DATE.json",
      "/api/assets/$DATE/$DATE.json",
      "/server/assets/episodes/$DATE/$DATE.json",
    ];

    for (const pathFormat of pathFormats) {
      try {
        console.log(`Trying path format: ${pathFormat}`);
        let processedAny = false;

        for (const date of possibleDates) {
          const jsonUrl = `${baseUrl}${pathFormat.replace(/\$DATE/g, date)}`;
          const srtUrl = jsonUrl.replace(".json", ".srt");

          try {
            console.log(`Trying to fetch: ${jsonUrl}`);
            const jsonResponse = await fetch(jsonUrl);

            if (!jsonResponse.ok) {
              console.log(
                `Failed to fetch JSON for ${date}: ${jsonResponse.status}`
              );
              continue;
            }

            const srtResponse = await fetch(srtUrl);
            if (!srtResponse.ok) {
              console.log(
                `Failed to fetch SRT for ${date}: ${srtResponse.status}`
              );
              continue;
            }

            const metadata = (await jsonResponse.json()) as VideoMetadata;
            const srtContent = await srtResponse.text();

            const subtitles = parseSRT(srtContent);

            // Process this episode using the standard logic
            await processEpisode(result, date, subtitles, metadata, searchTerm);
            processedAny = true;

            console.log(`Successfully processed ${date} using fetch`);
          } catch (fetchError) {
            console.warn(`Error fetching episode ${date}:`, fetchError);
          }
        }

        if (processedAny) {
          return true;
        }
      } catch (formatError) {
        console.error(`Error with path format "${pathFormat}":`, formatError);
      }
    }

    return false;
  } catch (error) {
    console.error("Error using fetch:", error);
    return false;
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

    // Initialize result object
    const result: WordAnalysisData = {
      word: searchTerm,
      totalCount: 0,
      episodes: [],
      speakers: {},
      contexts: [],
    };

    // Add a timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Analysis timed out after 30 seconds"));
      }, 30000);
    });

    // Try all methods, one by one
    const analysisPromise = (async () => {
      // Method 1: Try to use Nuxt's storage API
      const storageSuccess = await getDataUsingStorageAPI(result, searchTerm);

      if (storageSuccess) {
        console.log("Successfully retrieved data using Nuxt storage API");
        return result;
      }

      // Method 2: Try to use Node.js fs
      const fsSuccess = await getDataUsingNodeFS(result, searchTerm);

      if (fsSuccess) {
        console.log("Successfully retrieved data using Node.js fs");
        return result;
      }

      // Method 3: Try to use fetch
      const fetchSuccess = await getDataUsingFetch(result, searchTerm);

      if (fetchSuccess) {
        console.log("Successfully retrieved data using fetch");
        return result;
      }

      // If we got here, none of the methods worked
      console.warn("Could not retrieve data using any method");
      return result;
    })();

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
