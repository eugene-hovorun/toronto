import { computed, type Ref } from "vue";
import { type ChartData, type ChartOptions } from "chart.js";
import { chartUtils, formatUtils, wordAnalysisAPI } from "~/utils";
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

  // Computed properties for chart data
  const episodeChartData = computed<ChartData<"line">>(() => {
    if (!wordData.value) return { datasets: [] };

    // Create a copy of episodes array
    const episodesData = [...wordData.value.episodes];

    // Sort by date (chronological order)
    episodesData.sort((a, b) => a.date.localeCompare(b.date));

    const episodes = episodesData.map((ep) => formatEpisodeDate(ep.date));
    const counts = episodesData.map((ep) => ep.count);

    // Generate a single color for the line
    const lineColor = "rgba(75, 192, 192, 0.8)";

    return {
      labels: episodes,
      datasets: [
        {
          label: `Вживання слова "${props.word}"`,
          data: counts,
          fill: false,
          backgroundColor: lineColor,
          borderColor: lineColor,
          tension: 0.1,
          pointBackgroundColor: lineColor,
          pointBorderColor: "#fff",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  });

  const speakerChartData = computed<ChartData<"pie">>(() => {
    if (!wordData.value || !wordData.value.speakers) return { datasets: [] };

    const speakers = Object.keys(wordData.value.speakers);
    const counts = speakers.map((speaker) => wordData.value!.speakers[speaker]);
    const colors = chartUtils.generateColors(speakers.length);

    return {
      labels: speakers,
      datasets: [
        {
          data: counts,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((color: string) =>
            color.replace("0.7", "0.9")
          ),
        },
      ],
    };
  });

  // Chart options
  const lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Кількість вживань",
        },
      },
      x: {
        title: {
          display: true,
          text: "Дата епізоду",
        },
      },
    },
  };

  const pieChartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
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
