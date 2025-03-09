<template>
  <div class="max-w-4xl mx-auto px-4 py-6 md:px-6">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">
      Аналіз промов у подкасті
    </h1>

    <div class="bg-white rounded-xl shadow-md p-6 mb-8">
      <label
        for="word-input"
        class="block text-sm font-medium text-gray-700 mb-2"
        >Введіть слово для аналізу:</label
      >
      <div class="flex mb-4">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Введіть слово..."
          class="flex-1 py-2 px-4 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @keyup.enter="analyzeWord"
        />
        <button
          @click="analyzeWord"
          :disabled="!searchWord.trim()"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-r-lg transition duration-200"
        >
          Аналізувати
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <p class="font-medium text-gray-700">Популярні слова:</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(word, index) in commonWords"
            :key="index"
            class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200 transition duration-200"
            @click="selectCommonWord(word)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <WordChart v-if="activeWord" :word="activeWord" />

    <div v-else class="bg-white rounded-xl shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Інструкції</h2>
      <p class="text-gray-700 mb-4">
        Введіть слово в пошукове поле, щоб проаналізувати його вживання в усіх
        епізодах подкасту.
      </p>
      <p class="text-gray-700 mb-2">Аналіз покаже:</p>
      <ul class="list-disc pl-6 mb-4 text-gray-700 space-y-2">
        <li>Частоту вживання слова в кожному епізоді</li>
        <li>Які спікери найчастіше використовують це слово</li>
        <li>Приклади контексту, де вживається слово</li>
      </ul>
      <p class="text-gray-700 italic">
        Ви також можете натиснути на популярні слова вище для швидкого аналізу.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { type CommonWord, COMMON_WORDS } from "~/types";

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
  }
};

/**
 * Select a common word for analysis
 * @param word - The word to analyze
 */
const selectCommonWord = (word: CommonWord | string): void => {
  searchWord.value = word;
  activeWord.value = word;
};

// Export common words for easier testing and reuse
const commonWords = COMMON_WORDS;
</script>
