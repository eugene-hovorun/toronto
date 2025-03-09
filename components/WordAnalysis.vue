<template>
  <div class="max-w-4xl mx-auto px-4 py-6 md:px-6">
    <h1 class="font-headline text-3xl text-center text-gray-800 mt-4 mb-12">
      Словник Потіків <br />
      Що і як часто говорять ведучі
    </h1>

    <div class="bg-white rounded-xl shadow-md p-6 mb-8">
      <label
        for="word-input"
        class="block font-default text-sm font-medium text-gray-700 mb-2"
      >
        Яке слово цікавить?</label
      >
      <div class="flex mb-4">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Напишіть будь-яке слово..."
          class="font-default flex-1 py-2 px-4 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @keyup.enter="analyzeWord"
        />
        <button
          @click="analyzeWord"
          :disabled="!searchWord.trim()"
          class="font-default bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-r-lg transition duration-200"
        >
          Знайти
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <p class="font-default font-medium text-gray-700">
          Часті слова ведучих:
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(word, index) in commonWords"
            :key="index"
            class="font-default px-3 py-1 bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200 transition duration-200"
            @click="selectCommonWord(word)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <WordChart v-if="activeWord" :word="activeWord" />

    <div v-else class="bg-white rounded-xl shadow-md p-6">
      <h2 class="font-headline text-xl text-gray-800 mb-4">Як це працює</h2>
      <p class="font-default text-gray-700 mb-4">
        Цей інструмент допоможе зрозуміти, як часто і в якому контексті ведучі
        Потіків використовують різні слова. Просто введіть слово, яке вас
        цікавить.
      </p>
      <p class="font-default text-gray-700 mb-2">Ви дізнаєтесь:</p>
      <ul class="list-disc pl-6 mb-4 text-gray-700 space-y-2">
        <li class="font-default">
          Як змінювалась частота вживання слова з часом
        </li>
        <li class="font-default">Хто з ведучих найчастіше його використовує</li>
        <li class="font-default">Почуєте реальні приклади з епізодів</li>
      </ul>
      <p class="font-default text-gray-700 italic">
        Спробуйте одне з популярних слів вгорі або введіть своє власне.
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
