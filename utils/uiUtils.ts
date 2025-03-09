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
   * Highlights occurrences of the search word in text with a subtle, focused style
   * @param text - Text to highlight
   * @param word - Word to highlight
   * @returns HTML string with highlighted word
   */
  highlightWord: (text: string, word: string): string => {
    if (!word || !text) return text;

    // Make sure we match whole word and case-insensitive
    const regex = new RegExp(`(${word})`, "gi");

    // Replace with a subtle but clear highlighting style
    return text.replace(
      regex,
      '<span class="bg-purple-100 text-purple-800 px-1 rounded">$1</span>'
    );
  },
};

/**
 * Theme-based color utilities for charts
 */
export const colorUtils = {
  /**
   * Theme colors for the application
   */
  themeColors: {
    primary: "#c864ff", // Purple from gradient
    secondary: "#ff64c8", // Pink from gradient
    tertiary: "#64b4ff", // Blue from gradient
    quaternary: "#b264ff", // Light purple from gradient
    accent: "#ff6464", // Accent color
    background: "rgba(255, 255, 255, 0.9)",
    text: {
      primary: "#5b21b6", // Dark purple for text
      secondary: "#9333ea", // Medium purple for text
      light: "#ffffff", // White text
    },
    chart: {
      grid: "rgba(255, 255, 255, 0.2)",
      tooltip: {
        background: "rgba(255, 255, 255, 0.95)",
        border: "rgba(200, 100, 255, 0.8)",
      },
    },
  },

  /**
   * Get predefined speaker colors that match our theme
   */
  getSpeakerColors: (): Record<string, string> => {
    return {
      Максим: "#F892AB", // Pink
      Олександра: "#D57DFC", // Purple
      Аліна: "#64b4ff", // Blue from our theme
    };
  },

  /**
   * Generate colors within our theme palette for any additional items
   * @param count - Number of colors to generate
   * @returns Array of color strings that match the theme
   */
  generateThemedColors: (count: number): string[] => {
    const baseColors = [
      "#c864ff",
      "#ff64c8",
      "#64b4ff",
      "#b264ff",
      "#ff6464",
      "#a14ceb",
      "#eb4ca1",
      "#4ca1eb",
      "#9d4ceb",
      "#eb4c4c",
    ];

    // If we need more colors than we have in our base set, generate them
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Generate additional colors based on our theme
    const colors: string[] = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      // Create variants by adjusting the hue slightly
      const hueShift = i * 20;
      const r = Math.floor(Math.random() * 100) + 155; // Keep it bright
      const g = Math.floor(Math.random() * 100) + 100;
      const b = Math.floor(Math.random() * 100) + 155; // Keep blues and purples
      colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
    }

    return colors;
  },

  /**
   * Add hover effect to colors (make slightly lighter or more opaque)
   * @param colors - Array of color strings
   * @returns Array of modified color strings for hover states
   */
  createHoverColors: (colors: string[]): string[] => {
    return colors.map((color: string) => {
      // For hex colors, add 80% opacity for hover effect
      if (color.startsWith("#")) {
        return color + "CC";
      }
      // For rgba colors, increase opacity
      return color.replace(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
        (_, r, g, b) => `rgba(${r}, ${g}, ${b}, 0.9)`
      );
    });
  },
};
