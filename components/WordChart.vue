<template>
  <div class="word-chart-container">
    <div v-if="loading" class="loading">
      <p>Завантаження аналізу слова...</p>
    </div>
    <div v-else-if="error" class="error">
      <p>Помилка: {{ error }}</p>
    </div>
    <div
      v-else-if="!wordData || wordData.episodes.length === 0"
      class="no-data"
    >
      <p>Немає даних для слова "{{ word }}"</p>
    </div>
    <div v-else>
      <h3>Вживання слова "{{ word }}" в епізодах</h3>

      <!-- Time range caption -->
      <div class="time-range-caption">
        <p>
          Період аналізу: {{ formatEpisodeDate(timeRange.firstDate) }} —
          {{ formatEpisodeDate(timeRange.lastDate) }}
        </p>
      </div>

      <!-- Speaker distribution pie chart -->
      <div class="chart-container">
        <h4>Розподіл за спікерами</h4>
        <Pie :data="speakerChartData" :options="pieChartOptions" />
      </div>

      <!-- Episode frequency line chart -->
      <div class="chart-container">
        <Line :data="episodeChartData" :options="lineChartOptions" />
      </div>

      <!-- Word context examples -->
      <div
        class="contexts"
        v-if="wordData.contexts && wordData.contexts.length"
      >
        <h4>Приклади вживання:</h4>
        <div
          v-for="(context, index) in wordData.contexts.slice(0, 5)"
          :key="index"
          class="context-item"
        >
          <div class="context-layout">
            <!-- Thumbnail with YouTube link -->
            <div
              class="thumbnail-container"
              v-if="context.thumbnailUrl && context.youtubeLink"
            >
              <a
                :href="context.youtubeLink"
                target="_blank"
                rel="noopener noreferrer"
                class="video-link"
              >
                <img
                  :src="context.thumbnailUrl"
                  alt="Video thumbnail"
                  class="thumbnail"
                />
                <div class="play-icon">▶</div>
              </a>
            </div>

            <!-- Context text and metadata -->
            <div class="context-content">
              <p>
                <span class="episode">{{
                  formatEpisodeDate(context.episode)
                }}</span>
                <span class="timecode"
                  >[{{ formatTimecode(context.time) }}]</span
                >
                <span class="speaker">{{ context.speaker }}:</span>
                <span
                  class="text"
                  v-html="highlightWord(context.text, word)"
                ></span>
              </p>

              <!-- YouTube link as text -->
              <div class="youtube-link" v-if="context.youtubeLink">
                <a
                  :href="context.youtubeLink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Переглянути на YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { Line, Pie } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { formatUtils, chartUtils, wordAnalysisAPI } from "~/utils";
import { type WordAnalysisData, type TimeRange } from "~/types";

// Register ChartJS components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement
);

// Extract format utility methods
const { formatEpisodeDate, formatTimecode, highlightWord } = formatUtils;

// Define props
const props = defineProps<{
  word: string;
}>();

// Component state
const wordData = ref<WordAnalysisData | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);

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

// Watch for changes to the word prop
watch(
  () => props.word,
  (newWord?: string) => {
    if (newWord && newWord.trim() !== "") {
      fetchWordData();
    } else {
      wordData.value = null;
    }
  },
  { immediate: true }
);

// Clean up resources on component unmount
onMounted(() => {
  // Force initial fetch if the word is already set
  if (props.word && props.word.trim() !== "") {
    fetchWordData();
  }
});
</script>

<style scoped>
.word-chart-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.chart-container {
  height: 300px;
  margin-bottom: 30px;
}

.loading,
.error,
.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error {
  color: #d32f2f;
  background-color: #ffebee;
}

.time-range-caption {
  text-align: center;
  margin-bottom: 15px;
  font-style: italic;
  color: #666;
}

.contexts {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.context-item {
  margin-bottom: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.context-layout {
  display: flex;
  gap: 15px;
}

.thumbnail-container {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  overflow: hidden;
  border-radius: 4px;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-link:hover .thumbnail {
  transform: scale(1.05);
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.context-content {
  flex-grow: 1;
}

.episode {
  font-weight: bold;
  margin-right: 10px;
}

.timecode {
  color: #666;
  margin-right: 10px;
}

.speaker {
  font-weight: bold;
  color: #1976d2;
  margin-right: 10px;
}

.highlight {
  background-color: yellow;
  padding: 0 2px;
}

.youtube-link {
  margin-top: 8px;
}

.youtube-link a {
  display: inline-flex;
  align-items: center;
  color: #ff0000;
  text-decoration: none;
  font-size: 0.9rem;
}

.youtube-link a:hover {
  text-decoration: underline;
}
</style>
