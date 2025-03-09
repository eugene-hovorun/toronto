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
} from "chart.js";
import { useWordChartData } from "./utils";
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

// Get chart data and options from utils
const {
  timeRange,
  episodeChartData,
  speakerChartData,
  lineChartOptions,
  pieChartOptions,
  fetchWordData,
} = useWordChartData(props, wordData, loading, error);

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
