import { computed, type Ref } from "vue";
import { type ChartData, type ChartOptions } from "chart.js";
import { formatUtils, colorUtils, wordAnalysisAPI } from "~/utils";
import { type WordAnalysisData, type TimeRange } from "~/types";

/**
 * Hook that provides chart data and utilities for the WordChart component
 */
export const useWordChartData = (
  props: { word: string },
  wordData: Ref<WordAnalysisData | null>,
  loading: Ref<boolean>,
  error: Ref<string | null>
) => {
  const { formatEpisodeDate } = formatUtils;
  const {
    themeColors,
    getSpeakerColors,
    generateThemedColors,
    createHoverColors,
  } = colorUtils;

  // Get predefined speaker colors that match our theme
  const SPEAKER_COLORS = getSpeakerColors();

  // Computed property for time range
  const timeRange = computed<TimeRange>(() => {
    if (
      !wordData.value ||
      !wordData.value.episodes ||
      wordData.value.episodes.length === 0
    ) {
      return { firstDate: "", lastDate: "" };
    }

    // Make a copy of episodes to avoid mutating the original data
    const episodes = [...wordData.value.episodes];

    // Sort episodes by date
    episodes.sort((a, b) => a.date.localeCompare(b.date));

    // Get first and last dates
    const firstDate = episodes[0].date;
    const lastDate = episodes[episodes.length - 1].date;

    return { firstDate, lastDate };
  });

  // Computed properties for chart data with enhanced styling
  const episodeChartData = computed<ChartData<"line">>(() => {
    if (!wordData.value) return { datasets: [] };

    // Create a copy of episodes array
    const episodesData = [...wordData.value.episodes];

    // Sort by date (chronological order)
    episodesData.sort((a, b) => a.date.localeCompare(b.date));

    const episodes = episodesData.map((ep) => formatEpisodeDate(ep.date));
    const counts = episodesData.map((ep) => ep.count);

    // Use theme colors for the line chart
    const lineColor = themeColors.secondary; // Pink from our gradient

    return {
      labels: episodes,
      datasets: [
        {
          label: `Вживання слова "${props.word}"`,
          data: counts,
          fill: true,
          backgroundColor: `${lineColor}20`, // Very light background
          borderColor: lineColor,
          tension: 0.4, // Smoother curve
          pointBackgroundColor: themeColors.primary,
          pointBorderColor: "#fff",
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
        },
      ],
    };
  });

  const speakerChartData = computed<ChartData<"pie">>(() => {
    if (!wordData.value || !wordData.value.speakers) return { datasets: [] };

    const speakers = Object.keys(wordData.value.speakers);
    const counts = speakers.map((speaker) => wordData.value!.speakers[speaker]);

    // Use our predefined theme colors for each speaker
    let colors = speakers.map(
      (speaker) => SPEAKER_COLORS[speaker] || generateThemedColors(1)[0]
    );

    // If we don't have specific colors for all speakers, generate a themed set
    if (colors.some((color) => !color)) {
      colors = generateThemedColors(speakers.length);
    }

    // Create hover colors
    const hoverColors = createHoverColors(colors);

    return {
      labels: speakers,
      datasets: [
        {
          data: counts,
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          borderColor: "white",
          borderWidth: 2,
        },
      ],
    };
  });

  // Enhanced chart options that match our theme
  const lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Кількість вживань",
          color: themeColors.text.primary,
          font: {
            weight: "bold",
          },
        },
        grid: {
          color: themeColors.chart.grid,
        },
        ticks: {
          color: themeColors.text.primary,
          font: {
            weight: "bold",
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Дата епізоду",
          color: themeColors.text.primary,
          font: {
            weight: "bold",
          },
        },
        grid: {
          color: themeColors.chart.grid,
        },
        ticks: {
          color: themeColors.text.primary,
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: themeColors.text.primary,
          font: {
            weight: "bold",
          },
        },
      },
      tooltip: {
        backgroundColor: themeColors.chart.tooltip.background,
        titleColor: themeColors.text.primary,
        bodyColor: themeColors.text.secondary,
        borderColor: themeColors.chart.tooltip.border,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        usePointStyle: true,
      },
    },
    elements: {
      line: {
        tension: 0.4, // Smoother curve
      },
      point: {
        radius: 5,
        hoverRadius: 7,
      },
    },
  };

  const pieChartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: themeColors.text.primary,
          font: {
            weight: "bold",
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: themeColors.chart.tooltip.background,
        titleColor: themeColors.text.primary,
        bodyColor: themeColors.text.secondary,
        borderColor: themeColors.chart.tooltip.border,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        usePointStyle: true,
      },
    },
  };

  /**
   * Fetches word analysis data from the API
   */
  const fetchWordData = async (): Promise<void> => {
    if (!props.word || props.word.trim() === "") return;

    // Avoid duplicate requests for the same word
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      // Use the API service to fetch data
      const data = await wordAnalysisAPI.fetchWordData(props.word);

      // Filter data to only include the three specified speakers
      if (data && data.speakers) {
        const validSpeakers = ["Максим", "Олександра", "Аліна"];

        // Filter speakers object
        const filteredSpeakers: Record<string, number> = {};
        for (const speaker of validSpeakers) {
          if (data.speakers[speaker]) {
            filteredSpeakers[speaker] = data.speakers[speaker];
          }
        }
        data.speakers = filteredSpeakers;

        // Filter contexts array to include only valid speakers
        if (data.contexts) {
          data.contexts = data.contexts.filter((context) =>
            validSpeakers.includes(context.speaker)
          );
        }
      }

      wordData.value = data;
    } catch (err) {
      console.error("Error fetching word data:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to fetch word data";
      wordData.value = null;
    } finally {
      loading.value = false;
    }
  };

  return {
    timeRange,
    episodeChartData,
    speakerChartData,
    lineChartOptions,
    pieChartOptions,
    fetchWordData,
  };
};
