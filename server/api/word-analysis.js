import fs from "fs";
import path from "path";
import { promisify } from "util";
import { parseSRT } from "../utils/srtParser";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { word } = query;

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
        error: "Assets directory not found",
      };
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
    const result = {
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

        // Check if SRT file exists
        if (!fs.existsSync(srtFilePath)) {
          console.warn(`SRT file not found for episode ${episodeDir}`);
          continue;
        }

        console.log(`Processing SRT file: ${srtFilePath}`);

        // Read and parse SRT file
        const srtContent = await readFile(srtFilePath, "utf-8");
        const subtitles = parseSRT(srtContent);

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
            if (result.contexts.length < 20) {
              result.contexts.push({
                episode: episodeDir,
                time: subtitle.start,
                speaker,
                text: `${match[2].trim()}`,
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
  } catch (error) {
    console.error("Error analyzing word usage:", error);
    return {
      error: error.message || "Error analyzing word usage",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }
});
