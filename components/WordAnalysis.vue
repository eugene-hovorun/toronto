<template>
  <div class="w-full max-w-4xl mx-auto px-3 sm:px-0">
    <h1
      class="font-headline text-2xl sm:text-3xl md:text-4xl text-center text-white pt-8 mb-6 sm:mb-10 drop-shadow-lg"
    >
      Кастомний аналізатор
      <span class="block mt-2 text-xl sm:text-2xl font-light"
        >Що і як часто говорять ведучі</span
      >
    </h1>

    <div
      class="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-purple-100"
    >
      <label
        for="word-input"
        class="block font-default text-base sm:text-lg font-medium text-purple-900 mb-2 sm:mb-3"
      >
        Яке слово цікавить?
      </label>
      <div class="flex flex-col sm:flex-row mb-4 sm:mb-5 gap-2 sm:gap-0">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Напишіть будь-яке слово..."
          class="font-default w-full py-2 sm:py-3 px-3 sm:px-4 bg-white/60 border border-purple-200 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-purple-900 placeholder-purple-300"
          @keyup.enter="analyzeWord"
        />
        <button
          @click="analyzeWord"
          :disabled="!searchWord.trim()"
          class="font-default bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-l-none sm:rounded-r-lg transition duration-300 shadow-md"
        >
          Знайти
        </button>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <p
          class="font-default font-medium text-sm sm:text-base text-purple-900"
        >
          Часті слова ведучих:
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(word, index) in commonWords"
            :key="index"
            class="font-default px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm rounded-full cursor-pointer hover:from-purple-200 hover:to-pink-200 transition duration-200 border border-purple-200/50 shadow-sm"
            @click="selectCommonWord(word)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <WordChart :word="activeWord" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { type CommonWord, COMMON_WORDS } from "~/types";

// Default word to analyze if none is provided
const DEFAULT_WORD = "кастомний";

// Define props
const props = defineProps({
  initialWord: {
    type: String,
    default: DEFAULT_WORD,
  },
});

// Get route and router for navigation
const router = useRouter();
const route = useRoute();

// Component state
const searchWord = ref<string>("");
const activeWord = ref<string>("");

/**
 * Analyze the current search word
 */
const analyzeWord = (): void => {
  const trimmedWord = searchWord.value.trim();
  if (trimmedWord) {
    activeWord.value = trimmedWord;
    // Navigate to word page with the search term
    router.push(`/word/${encodeURIComponent(trimmedWord)}`);
  }
};

/**
 * Select a common word for analysis
 * @param word - The word to analyze
 */
const selectCommonWord = (word: CommonWord | string): void => {
  searchWord.value = word;
  activeWord.value = word;
  // Navigate to word page with the selected word
  router.push(`/word/${encodeURIComponent(word)}`);
};

// Initialize the component
onMounted(() => {
  // Set initial values based on props or query params
  const wordFromQuery = (route.query.word as string) || null;
  const wordToUse = wordFromQuery || props.initialWord || DEFAULT_WORD;

  searchWord.value = wordToUse;
  activeWord.value = wordToUse;

  // If we're on the index page with a query param, redirect to the word page
  if (route.path === "/" && wordFromQuery) {
    router.replace(`/word/${encodeURIComponent(wordFromQuery)}`);
  }
});

// Watch for route changes
watch(
  () => route.params.word,
  (newWord) => {
    if (newWord && typeof newWord === "string") {
      searchWord.value = newWord;
      activeWord.value = newWord;
    }
  }
);

// Export common words for easier testing and reuse
const commonWords = COMMON_WORDS;
</script>
