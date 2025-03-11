import { H3Event } from "h3";
import { WordAnalysisService } from "../services/WordAnalysisService";

/**
 * API endpoint handler for word analysis
 */
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

    // Create a new instance of the WordAnalysisService
    const wordAnalysisService = new WordAnalysisService();

    // Add a timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Analysis timed out after 15 seconds"));
      }, 15000);
    });

    // Perform the analysis
    const analysisPromise = wordAnalysisService.analyzeWordUsage(searchTerm);

    // Race between analysis and timeout
    const result = await Promise.race([analysisPromise, timeoutPromise]);

    console.log(
      `Analysis complete for "${searchTerm}". Total occurrences: ${result.totalCount}`
    );

    return result;
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
