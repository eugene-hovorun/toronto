<template>
  <div class="w-full max-w-3xl mx-auto px-3 sm:px-0">
    <div v-if="loading" class="flex justify-center items-center h-40 sm:h-56">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-700 mx-auto mb-3"
        ></div>
        <p class="font-default text-white text-base sm:text-lg">
          Аналізуємо вживання слова...
        </p>
      </div>
    </div>

    <div
      v-else-if="error"
      class="flex justify-center items-center h-40 sm:h-56 bg-red-50/90 backdrop-blur-sm text-red-600 border border-red-200 rounded-xl shadow-lg p-4"
    >
      <p class="font-default text-base sm:text-lg">
        На жаль, сталася помилка: {{ error }}
      </p>
    </div>

    <div
      v-else-if="wordData && wordData.episodes.length === 0"
      class="flex justify-center items-center h-40 sm:h-56 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg p-4"
    >
      <p class="font-default text-base sm:text-lg text-purple-800">
        Слово "{{ word }}" не знайдено в жодному епізоді
      </p>
    </div>

    <div v-else-if="wordData" class="space-y-6 sm:space-y-8">
      <!-- Time range caption with total count -->
      <div
        class="text-center py-3 px-4 sm:px-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-md border border-purple-200"
      >
        <p class="font-default text-sm sm:text-base text-purple-900">
          Проаналізовані епізоди:
          <span
            class="font-medium text-base sm:text-lg text-pink-700 block sm:inline mt-1 sm:mt-0"
          >
            {{ formatEpisodeDate(timeRange.firstDate) }} —
            {{ formatEpisodeDate(timeRange.lastDate) }}
          </span>
        </p>
        <p class="font-default text-sm sm:text-base text-purple-900 mt-1">
          Загальна кількість вживань:
          <span class="font-medium text-base sm:text-lg text-pink-700">
            {{ wordData.totalCount }}
          </span>
        </p>
      </div>

      <!-- Speaker distribution pie chart -->
      <div
        class="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-purple-200"
      >
        <h4
          class="font-headline text-lg sm:text-xl text-purple-900 mb-3 sm:mb-4 pb-2 border-b border-purple-100"
        >
          Хто найчастіше вживає це слово
        </h4>
        <div class="h-60 sm:h-72">
          <Pie :data="speakerChartData" :options="pieChartOptions" />
        </div>
      </div>

      <!-- Episode frequency line chart -->
      <div
        class="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-purple-200"
      >
        <div class="h-60 sm:h-72">
          <Line :data="episodeChartData" :options="lineChartOptions" />
        </div>
      </div>

      <WordContext :wordData="wordData" :word="word" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
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
import { type WordAnalysisData } from "~/types";

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
const { getSpeakerColors } = colorUtils;

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

// Watch for word changes and fetch data
watch(
  () => props.word,
  (newWord) => {
    if (newWord && newWord.trim() !== "") {
      fetchWordData();
    } else {
      wordData.value = null;
    }
  },
  { immediate: true }
);
</script>
