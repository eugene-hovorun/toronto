<template>
  <div class="max-w-3xl mx-auto p-6">
    <div v-if="loading" class="flex justify-center items-center h-52">
      <p class="font-default text-gray-600">Аналізуємо вживання слова...</p>
    </div>
    <div
      v-else-if="error"
      class="flex justify-center items-center h-52 bg-red-50 text-red-600 border border-red-200 rounded-lg"
    >
      <p class="font-default">На жаль, сталася помилка: {{ error }}</p>
    </div>
    <div
      v-else-if="!wordData || wordData.episodes.length === 0"
      class="flex justify-center items-center h-52 border border-gray-200 rounded-lg"
    >
      <p class="font-default text-gray-600">
        Слово "{{ word }}" не знайдено в жодному епізоді
      </p>
    </div>

    <div v-else class="space-y-6">
      <!-- Time range caption with total count -->
      <div class="text-center font-default text-sm italic text-gray-500">
        <p>
          Проаналізовані епізоди:
          <span class="font-medium text-blue-700">
            {{ formatEpisodeDate(timeRange.firstDate) }} —
            {{ formatEpisodeDate(timeRange.lastDate) }}
          </span>
        </p>
        <p>
          Загальна кількість вживань:
          <span class="font-medium text-blue-700">
            {{ wordData.totalCount }}
          </span>
        </p>
      </div>

      <!-- Speaker distribution pie chart -->
      <div class="mb-8">
        <h4 class="font-headline text-lg text-gray-700 mb-3">
          Хто найчастіше вживає це слово
        </h4>
        <div class="h-72">
          <Pie :data="speakerChartData" :options="pieChartOptions" />
        </div>
      </div>

      <!-- Episode frequency line chart -->
      <div class="mb-8">
        <div class="h-72">
          <Line :data="episodeChartData" :options="lineChartOptions" />
        </div>
      </div>

      <!-- Word context examples -->
      <div
        class="mt-8 pt-6"
        v-if="wordData.contexts && wordData.contexts.length"
      >
        <h4 class="font-headline text-lg text-gray-700 mb-4">
          Як це звучить у контексті:
        </h4>
        <div class="space-y-4">
          <div
            v-for="(context, index) in wordData.contexts.slice(0, 5)"
            :key="index"
            class="bg-gray-50 rounded-lg p-4"
          >
            <div class="flex gap-4">
              <!-- Thumbnail with timecode underneath -->
              <div
                class="relative flex-shrink-0 w-32 h-24 overflow-hidden rounded-md"
                v-if="context.thumbnailUrl && context.youtubeLink"
              >
                <a
                  :href="context.youtubeLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block"
                >
                  <img
                    :src="context.thumbnailUrl"
                    alt="Прев'ю відео"
                    class="w-full h-full object-fill transition-transform duration-300 hover:scale-105"
                  />
                </a>
                <!-- Timecode positioned under the thumbnail -->
                <span
                  class="absolute bottom-0 left-0 right-0 bg-zinc-600 bg-opacity-60 text-white text-xs py-1 text-center"
                >
                  {{ formatTimecode(context.time) }}
                </span>
              </div>

              <!-- Context text and metadata -->
              <div class="flex-grow">
                <!-- Episode metadata in a more compact, scannable format -->
                <div class="flex justify-between items-center mb-2 text-sm">
                  <span
                    class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium"
                  >
                    {{ context.speaker }}
                  </span>
                  <span class="font-medium text-gray-800">
                    {{ formatEpisodeDate(context.episode) }}
                  </span>
                </div>

                <!-- Quote with improved readability - Main focus point -->
                <div
                  class="font-default bg-white p-4 rounded-md border-l-4 border-blue-300 my-2 shadow-sm"
                >
                  <p
                    class="text-gray-800 text-base"
                    v-html="highlightWord(context.text, word)"
                  ></p>
                </div>

                <!-- Listen button - Small and subtle -->
                <div v-if="context.youtubeLink" class="flex justify-end mt-2">
                  <a
                    :href="context.youtubeLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-600 hover:text-red-600 text-xs flex items-center gap-1 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <span>Послухати</span>
                  </a>
                </div>
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
