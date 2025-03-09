/**
 * Format utilities for date and time
 */
export const formatUtils = {
  /**
   * Formats episode date from YYYY-MM-DD to DD.MM.YYYY
   * @param episode - Episode date string in YYYY-MM-DD format
   * @returns Formatted date string
   */
  formatEpisodeDate: (episode: string): string => {
    if (!episode) return "";
    const [year, month, day] = episode.split("-");
    return `${day}.${month}.${year}`;
  },

  /**
   * Formats time in seconds to MM:SS format
   * @param timeInSeconds - Time in seconds
   * @returns Formatted time string
   */
  formatTimecode: (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  },

  /**
   * Highlights occurrences of the search word in text
   * @param text - Text to highlight
   * @param word - Word to highlight
   * @returns HTML string with highlighted word
   */
  highlightWord: (text: string, word: string): string => {
    if (!word || !text) return text;
    const regex = new RegExp(`(${word})`, "gi");
    return text.replace(regex, '<strong class="highlight">$1</strong>');
  },
};

/**
 * Chart utilities
 */
export const chartUtils = {
  /**
   * Generates random colors for chart elements
   * @param count - Number of colors to generate
   * @returns Array of RGBA color strings
   */
  generateColors: (count: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 200) + 55;
      const g = Math.floor(Math.random() * 200) + 55;
      const b = Math.floor(Math.random() * 200) + 55;
      colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
  },
};
