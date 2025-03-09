<!-- index.vue (WordChart) -->
<template>
  <div class="max-w-3xl mx-auto">
    <div v-if="loading" class="flex justify-center items-center h-56">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-3"
        ></div>
        <p class="font-default text-white text-lg">
          Аналізуємо вживання слова...
        </p>
      </div>
    </div>

    <div
      v-else-if="error"
      class="flex justify-center items-center h-56 bg-red-50/90 backdrop-blur-sm text-red-600 border border-red-200 rounded-xl shadow-lg"
    >
      <p class="font-default text-lg">На жаль, сталася помилка: {{ error }}</p>
    </div>

    <div
      v-else-if="!wordData || wordData.episodes.length === 0"
      class="flex justify-center items-center h-56 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg"
    >
      <p class="font-default text-lg text-purple-800">
        Слово "{{ word }}" не знайдено в жодному епізоді
      </p>
    </div>

    <div v-else class="space-y-8">
      <!-- Time range caption with total count -->
      <div
        class="text-center py-3 px-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-purple-200"
      >
        <p class="font-default text-base text-purple-900">
          Проаналізовані епізоди:
          <span class="font-medium text-lg text-pink-700">
            {{ formatEpisodeDate(timeRange.firstDate) }} —
            {{ formatEpisodeDate(timeRange.lastDate) }}
          </span>
        </p>
        <p class="font-default text-base text-purple-900 mt-1">
          Загальна кількість вживань:
          <span class="font-medium text-lg text-pink-700">
            {{ wordData.totalCount }}
          </span>
        </p>
      </div>

      <!-- Speaker distribution pie chart -->
      <div
        class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-200"
      >
        <h4
          class="font-headline text-xl text-purple-900 mb-4 pb-2 border-b border-purple-100"
        >
          Хто найчастіше вживає це слово
        </h4>
        <div class="h-72">
          <Pie :data="speakerChartData" :options="pieChartOptions" />
        </div>
      </div>

      <!-- Episode frequency line chart -->
      <div
        class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-200"
      >
        <div class="h-72">
          <Line :data="episodeChartData" :options="lineChartOptions" />
        </div>
      </div>

      <!-- Word context examples -->
      <div
        class="mt-8 pt-2"
        v-if="wordData.contexts && wordData.contexts.length"
      >
        <h4 class="font-headline text-xl text-white drop-shadow-md mb-4 px-2">
          Як це звучить у контексті:
        </h4>
        <div class="space-y-4">
          <div
            v-for="(context, index) in wordData.contexts.slice(0, 5)"
            :key="index"
            class="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-purple-100/30 transition-all"
          >
            <div class="flex gap-4">
              <!-- Thumbnail with timecode underneath - smaller size -->
              <div
                class="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 overflow-hidden rounded-md"
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
                    class="w-full h-full object-cover"
                  />
                </a>
                <!-- Simplified timecode -->
                <span
                  class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-0.5 text-center"
                >
                  {{ formatTimecode(context.time) }}
                </span>
              </div>

              <!-- Context text and metadata -->
              <div class="flex-grow">
                <!-- Simplified metadata - more subtle and minimal -->
                <div
                  class="flex justify-between items-center mb-3 text-xs text-gray-500"
                >
                  <span class="text-sm text-purple-700 font-medium">{{
                    context.speaker
                  }}</span>
                  <span>{{ formatEpisodeDate(context.episode) }}</span>
                </div>

                <!-- Quote - no extra container, just the text -->
                <div class="font-default">
                  <p
                    class="text-gray-800"
                    v-html="highlightWord(context.text, word)"
                  ></p>
                </div>

                <!-- Listen link - small and unobtrusive -->
                <div v-if="context.youtubeLink" class="flex justify-end mt-2">
                  <a
                    :href="context.youtubeLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-400 hover:text-purple-500 text-xs flex items-center gap-1 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3"
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

// Get chart data and options from utils - we'll customize chart colors in this function
const {
  timeRange,
  episodeChartData,
  speakerChartData,
  lineChartOptions,
  pieChartOptions,
  fetchWordData,
} = useWordChartData(props, wordData, loading, error);

// Customize chart options to match our color scheme
// Note: This assumes the implementation of useWordChartData allows for customization
// If not, you would override the options here

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
