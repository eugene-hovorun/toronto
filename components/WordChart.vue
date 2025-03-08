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

      <!-- Episode frequency bar chart -->
      <div class="chart-container">
        <Bar :data="episodeChartData" :options="barChartOptions" />
      </div>

      <!-- Speaker distribution pie chart -->
      <div class="chart-container">
        <h4>Розподіл за спікерами</h4>
        <Pie :data="speakerChartData" :options="pieChartOptions" />
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
          <p>
            <span class="episode">{{
              formatEpisodeDate(context.episode)
            }}</span>
            <span class="timecode">[{{ formatTimecode(context.time) }}]</span>
            <span class="speaker">{{ context.speaker }}:</span>
            <span class="text" v-html="highlightWord(context.text)"></span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { Bar, Pie } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
);

const props = defineProps({
  word: {
    type: String,
    required: true,
  },
});

const wordData = ref(null);
const loading = ref(false);
const error = ref(null);

// Generate random colors for charts
const generateColors = (count) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * 200) + 55;
    const g = Math.floor(Math.random() * 200) + 55;
    const b = Math.floor(Math.random() * 200) + 55;
    colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
  }
  return colors;
};

// Format episode date (from filename like 2024-07-24)
const formatEpisodeDate = (episode) => {
  const [year, month, day] = episode.split("-");
  return `${day}.${month}.${year}`;
};

// Format timecode (from seconds to MM:SS)
const formatTimecode = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

// Highlight the target word in context text
const highlightWord = (text) => {
  if (!props.word || !text) return text;

  const regex = new RegExp(`(${props.word})`, "gi");
  return text.replace(regex, '<strong class="highlight">$1</strong>');
};

// Computed properties for chart data
const episodeChartData = computed(() => {
  if (!wordData.value) return { datasets: [] };

  // Create a copy of episodes array
  const episodesData = [...wordData.value.episodes];

  // Sort by date (chronological order)
  episodesData.sort((a, b) => a.date.localeCompare(b.date));

  const episodes = episodesData.map((ep) => formatEpisodeDate(ep.date));
  const counts = episodesData.map((ep) => ep.count);
  const colors = generateColors(episodes.length);

  return {
    labels: episodes,
    datasets: [
      {
        label: `Вживання слова "${props.word}"`,
        data: counts,
        backgroundColor: colors,
        borderColor: colors.map((color) => color.replace("0.7", "1")),
        borderWidth: 1,
      },
    ],
  };
});

const speakerChartData = computed(() => {
  if (!wordData.value || !wordData.value.speakers) return { datasets: [] };

  const speakers = Object.keys(wordData.value.speakers);
  const counts = speakers.map((speaker) => wordData.value.speakers[speaker]);
  const colors = generateColors(speakers.length);

  return {
    labels: speakers,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
        hoverBackgroundColor: colors.map((color) =>
          color.replace("0.7", "0.9")
        ),
      },
    ],
  };
});

// Chart options
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

// Function to fetch word data from server
const fetchWordData = async () => {
  if (!props.word || props.word.trim() === "") return;

  // Avoid duplicate requests for the same word
  if (loading.value) return;

  console.log(`Fetching data for word: ${props.word}`);
  loading.value = true;
  error.value = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `/api/word-analysis?word=${encodeURIComponent(props.word.trim())}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`Received data for "${props.word}"`, data);

    if (data.error) {
      throw new Error(data.error);
    }

    wordData.value = data;
  } catch (err) {
    console.error("Error fetching word data:", err);
    error.value = err.message || "Failed to fetch word data";
    wordData.value = null;
  } finally {
    loading.value = false;
  }
};

// Watch for changes to the word prop
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

// Remove the onMounted handler that was causing duplicate requests
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

.contexts {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.context-item {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
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
</style>
