import { SrtParser } from "../utils/srtParser";
import {
  type VideoMetadata,
  type Subtitle,
  type Context,
  VALID_SPEAKERS,
  MIN_CONTEXT_LENGTH,
  MAX_CONTEXT_TIME_GAP,
} from "~/types";

/**
 * Service responsible for subtitle processing and context extraction
 */
export class SubtitleService {
  /**
   * Processes a subtitle file and extracts context information
   *
   * @param srtContent - Raw SRT file content
   * @param searchTerm - Term to search for in subtitles
   * @param episodeDate - Date of the episode
   * @param metadata - Video metadata for the episode
   * @returns Analysis data for subtitles including context examples
   */
  public processSubtitles(
    srtContent: string,
    searchTerm: string,
    episodeDate: string,
    metadata: VideoMetadata
  ): {
    occurrenceCount: number;
    speakerCounts: Record<string, number>;
    contexts: Context[];
  } {
    // Parse the SRT content
    const subtitles = SrtParser.parse(srtContent);

    // Extract video ID from thumbnail URL for YouTube links
    const thumbnailUrl = metadata.thumbnails?.medium?.url || "";
    const videoId = this.extractVideoId(thumbnailUrl);

    let totalOccurrences = 0;
    const speakerCounts: Record<string, number> = {};
    const contexts: Context[] = [];

    // Process each subtitle entry
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];

      // Extract speaker and speech from subtitle text
      const speakerSpeech = SrtParser.extractSpeakerAndSpeech(subtitle.text);
      if (!speakerSpeech) continue;

      const { speaker, speech } = speakerSpeech;

      // Skip if speaker is not in our valid list
      if (!VALID_SPEAKERS.includes(speaker)) continue;

      // Count occurrences of search term
      const occurrences = this.countOccurrences(speech, searchTerm);

      if (occurrences > 0) {
        // Update totals
        totalOccurrences += occurrences;
        speakerCounts[speaker] = (speakerCounts[speaker] || 0) + occurrences;

        // Add context if we haven't reached the limit
        if (contexts.length < 20) {
          // Get extended context if original speech is too short
          let contextText = speech;

          // Always try to extend the context for richer information
          contextText = this.extendContext(subtitles, i, speaker);

          // Get conversational context from other speakers for more depth
          const conversationalContext = this.getConversationalContext(
            subtitles,
            i
          );

          // Combine contexts if conversational context adds value
          if (conversationalContext && conversationalContext.length > 0) {
            contextText = this.combineContexts(
              contextText,
              conversationalContext
            );
          }

          // Only add if context is valid and meaningful
          if (this.isValidContext(contextText, searchTerm)) {
            // Create YouTube link with timestamp
            const youtubeTimestamp = Math.floor(subtitle.start);
            const youtubeLink = videoId
              ? `https://www.youtube.com/watch?v=${videoId}&t=${youtubeTimestamp}`
              : null;

            contexts.push({
              episode: episodeDate,
              time: subtitle.start,
              speaker,
              text: contextText,
              thumbnailUrl,
              youtubeLink,
            });
          }
        }
      }
    }

    return {
      occurrenceCount: totalOccurrences,
      speakerCounts,
      contexts,
    };
  }

  /**
   * Extends the context by adding nearby subtitles from the same speaker
   * with enhanced context gathering
   */
  private extendContext(
    subtitles: Subtitle[],
    currentIndex: number,
    speaker: string,
    maxSubtitles: number = 4 // Increased from 2 to 4
  ): string {
    let context = "";
    let subtitlesAdded = 0;

    // Get the current subtitle's speech
    const currentSpeech =
      SrtParser.extractSpeakerAndSpeech(subtitles[currentIndex].text)?.speech ||
      "";
    context = currentSpeech;

    // Wider time gap for more context
    const enhancedTimeGap = MAX_CONTEXT_TIME_GAP * 1.5;

    // Look forward for additional context
    let forwardIndex = currentIndex + 1;
    while (
      forwardIndex < subtitles.length &&
      subtitlesAdded < maxSubtitles &&
      subtitles[forwardIndex].start <=
        subtitles[currentIndex].start + enhancedTimeGap
    ) {
      const nextSubtitleInfo = SrtParser.extractSpeakerAndSpeech(
        subtitles[forwardIndex].text
      );
      if (nextSubtitleInfo && nextSubtitleInfo.speaker === speaker) {
        context += " " + nextSubtitleInfo.speech;
        subtitlesAdded++;
      }
      forwardIndex++;
    }

    // Look backward for additional context
    let backwardIndex = currentIndex - 1;
    while (
      backwardIndex >= 0 &&
      subtitlesAdded < maxSubtitles &&
      subtitles[currentIndex].start - subtitles[backwardIndex].end <=
        enhancedTimeGap
    ) {
      const prevSubtitleInfo = SrtParser.extractSpeakerAndSpeech(
        subtitles[backwardIndex].text
      );
      if (prevSubtitleInfo && prevSubtitleInfo.speaker === speaker) {
        context = prevSubtitleInfo.speech + " " + context;
        subtitlesAdded++;
      }
      backwardIndex--;
    }

    return this.sanitizeContext(context);
  }

  /**
   * Gets conversational context from other speakers to provide dialogue context
   */
  private getConversationalContext(
    subtitles: Subtitle[],
    currentIndex: number,
    maxExchanges: number = 2
  ): string {
    let conversationalContext = "";
    let exchangesAdded = 0;

    // Get the current subtitle's speaker
    const currentSpeakerInfo = SrtParser.extractSpeakerAndSpeech(
      subtitles[currentIndex].text
    );
    if (!currentSpeakerInfo) return conversationalContext;

    const currentSpeaker = currentSpeakerInfo.speaker;

    // Time range for dialogue context (more focused than extended context)
    const dialogueTimeGap = MAX_CONTEXT_TIME_GAP;

    // Look backward first for previous exchanges
    let backwardIndex = currentIndex - 1;
    while (
      backwardIndex >= 0 &&
      exchangesAdded < maxExchanges &&
      subtitles[currentIndex].start - subtitles[backwardIndex].end <=
        dialogueTimeGap
    ) {
      const prevSubtitleInfo = SrtParser.extractSpeakerAndSpeech(
        subtitles[backwardIndex].text
      );

      if (
        prevSubtitleInfo &&
        prevSubtitleInfo.speaker !== currentSpeaker &&
        VALID_SPEAKERS.includes(prevSubtitleInfo.speaker)
      ) {
        conversationalContext =
          `[${prevSubtitleInfo.speaker}]: ${prevSubtitleInfo.speech} ` +
          conversationalContext;
        exchangesAdded++;
      }
      backwardIndex--;
    }

    // Look forward for responses to the current speaker
    exchangesAdded = 0; // Reset counter for forward exchanges
    let forwardIndex = currentIndex + 1;
    while (
      forwardIndex < subtitles.length &&
      exchangesAdded < maxExchanges &&
      subtitles[forwardIndex].start <=
        subtitles[currentIndex].start + dialogueTimeGap
    ) {
      const nextSubtitleInfo = SrtParser.extractSpeakerAndSpeech(
        subtitles[forwardIndex].text
      );

      if (
        nextSubtitleInfo &&
        nextSubtitleInfo.speaker !== currentSpeaker &&
        VALID_SPEAKERS.includes(nextSubtitleInfo.speaker)
      ) {
        if (conversationalContext) {
          conversationalContext += " ";
        }
        conversationalContext += `[${nextSubtitleInfo.speaker}]: ${nextSubtitleInfo.speech}`;
        exchangesAdded++;
      }
      forwardIndex++;
    }

    return conversationalContext;
  }

  /**
   * Combines the main speaker context with conversational context
   */
  private combineContexts(
    mainContext: string,
    conversationalContext: string
  ): string {
    if (!conversationalContext) return mainContext;

    // If conversation is short, combine them directly
    if (conversationalContext.length < 100) {
      return `${mainContext} (Context: ${conversationalContext})`;
    }

    // For longer conversations, use a more structured format
    return `${mainContext}\n\nConversational context:\n${conversationalContext}`;
  }

  /**
   * Sanitizes and formats the context for better readability
   */
  private sanitizeContext(text: string): string {
    if (!text) return "";

    // Remove excessive spaces
    let sanitized = text.replace(/\s+/g, " ").trim();

    // Capitalize first letter of sentences
    sanitized = sanitized.replace(/(\.\s+|^\s*)([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });

    // Fix common punctuation issues
    sanitized = sanitized
      .replace(/\s+\./g, ".")
      .replace(/\s+,/g, ",")
      .replace(/\s+\?/g, "?")
      .replace(/\s+\!/g, "!");

    return sanitized;
  }

  /**
   * Checks if a context is valid and meaningful
   */
  private isValidContext(text: string, searchTerm: string): boolean {
    if (!text) return false;
    if (text.length < 10) return false;

    // Check if the context has enough words excluding the search term
    const textWithoutSearchTerm = text
      .toLowerCase()
      .replace(new RegExp(searchTerm, "gi"), "")
      .trim();

    const wordCount = textWithoutSearchTerm
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Increased minimum word requirement for more meaningful context
    return wordCount >= 5; // Increased from 3 to 5
  }

  /**
   * Counts occurrences of a search term in text
   */
  private countOccurrences(text: string, searchTerm: string): number {
    const textLower = text.toLowerCase();
    let count = 0;
    let pos = textLower.indexOf(searchTerm);

    while (pos !== -1) {
      count++;
      pos = textLower.indexOf(searchTerm, pos + 1);
    }

    return count;
  }

  /**
   * Extracts video ID from YouTube thumbnail URL
   */
  private extractVideoId(thumbnailUrl: string): string {
    const videoIdMatch = thumbnailUrl.match(/\/vi\/([^\/]+)\//);
    return videoIdMatch ? videoIdMatch[1] : "";
  }
}
