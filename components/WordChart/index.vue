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
      <h3 class="font-headline text-xl text-gray-800">
        Як часто звучить "{{ word }}" у Потіках
      </h3>

      <!-- Time range caption -->
      <div class="text-center">
        <p class="font-default text-sm italic text-gray-500">
          Проаналізовані епізоди: {{ formatEpisodeDate(timeRange.firstDate) }} —
          {{ formatEpisodeDate(timeRange.lastDate) }}
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
        class="mt-8 pt-6 border-t border-gray-200"
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
              <!-- Thumbnail with YouTube link -->
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
                    class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      class="bg-black bg-opacity-70 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      ▶
                    </div>
                  </div>
                </a>
              </div>

              <!-- Context text and metadata -->
              <div class="flex-grow">
                <p class="font-default">
                  <span class="font-semibold mr-2">{{
                    formatEpisodeDate(context.episode)
                  }}</span>
                  <span class="text-gray-500 mr-2"
                    >[{{ formatTimecode(context.time) }}]</span
                  >
                  <span class="font-semibold text-blue-600 mr-2"
                    >{{ context.speaker }}:</span
                  >
                  <span v-html="highlightWord(context.text, word)"></span>
                </p>

                <!-- YouTube link as text -->
                <div class="mt-2" v-if="context.youtubeLink">
                  <a
                    :href="context.youtubeLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-default inline-flex items-center text-red-600 hover:underline text-sm"
                  >
                    Послухати цей момент
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
