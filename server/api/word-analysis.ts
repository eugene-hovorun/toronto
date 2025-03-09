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

// Helper function to check if a context is meaningful enough to display
function isValidContext(text: string, searchTerm: string): boolean {
  if (!text) return false;

  // Check if text is too short (less than 10 characters)
  if (text.length < 10) return false;

  // Remove the search term from the text to see what else is there
  const textWithoutSearchTerm = text
    .toLowerCase()
    .replace(new RegExp(searchTerm, "gi"), "")
    .trim();

  // Count words in the remaining text
  const wordCount = textWithoutSearchTerm
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Context is valid if it has at least 3 other words besides the search term
  return wordCount >= 3;
}

// Helper function to format timestamp for YouTube URL
function formatYouTubeTimestamp(seconds: number): number {
  // YouTube timestamp format is just seconds for any value
  return Math.floor(seconds);
}

export default defineEventHandler(async (event: H3Event) => {
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
    console.log(`Processing search for term: ${searchTerm}`);

    // Get all episode directories from the assets folder
    const assetsDir = path.join(process.cwd(), "assets");
    console.log(`Looking in assets directory: ${assetsDir}`);

    if (!fs.existsSync(assetsDir)) {
      console.error(`Assets directory not found: ${assetsDir}`);
      return {
        word: searchTerm,
        totalCount: 0,
        episodes: [],
        speakers: {},
        contexts: [],
        error: "Assets directory not found",
      } as WordAnalysisData;
    }

    const episodeDirs = await readdir(assetsDir);
    console.log(`Found ${episodeDirs.length} potential episode directories`);

    // Filter out directories that don't match our expected pattern (YYYY-MM-DD)
    const validEpisodeDirs = episodeDirs.filter((dir) =>
      /^\d{4}-\d{2}-\d{2}$/.test(dir)
    );
    console.log(`Found ${validEpisodeDirs.length} valid episode directories`);

    // Sort directories by date (newest first)
    validEpisodeDirs.sort((a, b) => b.localeCompare(a));

    // Initialize result object
    const result: WordAnalysisData = {
      word: searchTerm,
      totalCount: 0,
      episodes: [],
      speakers: {},
      contexts: [],
    };

    // Add a timeout to prevent infinite hanging
    const timeout = setTimeout(() => {
      console.error("Analysis timed out after 30 seconds");
      throw new Error("Analysis timed out");
    }, 30000); // 30 second timeout

    try {
      // Process each episode directory
      for (const episodeDir of validEpisodeDirs) {
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

        // Check if SRT file exists
        if (!fs.existsSync(srtFilePath)) {
          console.warn(`SRT file not found for episode ${episodeDir}`);
          continue;
        }

        // Check if JSON metadata file exists
        if (!fs.existsSync(jsonFilePath)) {
          console.warn(
            `JSON metadata file not found for episode ${episodeDir}`
          );
          continue;
        }

        console.log(`Processing SRT file: ${srtFilePath}`);

        // Read and parse SRT file
        const srtContent = await readFile(srtFilePath, "utf-8");
        const subtitles = parseSRT(srtContent);

        // Read and parse JSON metadata file
        const jsonContent = await readFile(jsonFilePath, "utf-8");
        const metadata = JSON.parse(jsonContent) as VideoMetadata;

        // Extract video ID from thumbnail URL
        const thumbnailUrl = metadata.thumbnails?.default?.url || "";
        const videoIdMatch = thumbnailUrl.match(/\/vi\/([^\/]+)\//);
        const videoId = videoIdMatch ? videoIdMatch[1] : "";

        console.log(
          `Parsed ${subtitles.length} subtitle entries for ${episodeDir}`
        );

        let episodeCount = 0;

        // Process each subtitle entry
        for (const subtitle of subtitles) {
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
            result.speakers[speaker] =
              (result.speakers[speaker] || 0) + occurrences;

            // Add to contexts (limited to avoid too much data)
            // Only add if the context is valid and meaningful
            if (
              result.contexts.length < 20 &&
              isValidContext(text, searchTerm)
            ) {
              // Create YouTube link with timestamp
              const youtubeTimestamp = formatYouTubeTimestamp(subtitle.start);
              const youtubeLink = videoId
                ? `https://www.youtube.com/watch?v=${videoId}&t=${youtubeTimestamp}`
                : null;

              result.contexts.push({
                episode: episodeDir,
                time: subtitle.start,
                speaker,
                text: match[2].trim(),
                thumbnailUrl: thumbnailUrl,
                youtubeLink: youtubeLink,
              });
            }
          }
        }

        // Only add episodes where the word was found
        if (episodeCount > 0) {
          result.episodes.push({
            date: episodeDir,
            count: episodeCount,
          });
          console.log(
            `Found ${episodeCount} occurrences of "${searchTerm}" in episode ${episodeDir}`
          );
        }
      }

      // Sort episodes by date (chronological order), not by count
      result.episodes.sort((a, b) => a.date.localeCompare(b.date));

      // Don't forget to clear the timeout if everything completes successfully
      clearTimeout(timeout);

      console.log(
        `Analysis complete for "${searchTerm}". Total occurrences: ${result.totalCount}`
      );
      return result;
    } catch (innerError) {
      clearTimeout(timeout);
      throw innerError;
    }
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
