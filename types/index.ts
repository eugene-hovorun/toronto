/**
 * Interface for episode data in search results
 */
export interface Episode {
  date: string;
  count: number;
}

/**
 * Interface for context examples in search results
 */
export interface Context {
  episode: string;
  time: number;
  speaker: string;
  text: string;
  thumbnailUrl: string;
  youtubeLink: string | null;
}

/**
 * Interface for word analysis data from the API
 */
export interface WordAnalysisData {
  word: string;
  totalCount: number;
  episodes: Episode[];
  speakers: Record<string, number>;
  contexts: Context[];
  error?: string;
}

/**
 * Interface for time range information
 */
export interface TimeRange {
  firstDate: string;
  lastDate: string;
}

/**
 * Interface for chart data format options
 */
export interface ChartFormatOptions {
  dateFormat?: "DD.MM.YYYY" | "YYYY-MM-DD";
  timeFormat?: "MM:SS" | "HH:MM:SS";
}

/**
 * Common words used for quick analysis
 */
export const COMMON_WORDS = [
  "Україна",
  "кастомний",
  "війна",
  "донат",
  "потік",
  "гроші",
  "збір",
  "книжка",
] as const;

/**
 * Type for common words
 */
export type CommonWord = (typeof COMMON_WORDS)[number];

/**
 * Interface for subtitle object
 */
export interface Subtitle {
  start: number;
  end: number;
  text: string;
}

/**
 * Interface for speaker and speech extraction
 */
export interface SpeakerSpeech {
  speaker: string;
  speech: string;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface VideoMetadata {
  thumbnails?: {
    default?: Thumbnail;
    medium?: Thumbnail;
    high?: Thumbnail;
  };
  [key: string]: any;
}
