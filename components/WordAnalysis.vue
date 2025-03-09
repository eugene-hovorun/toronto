<!-- WordAnalysis.vue -->
<template>
  <div class="max-w-4xl mx-auto">
    <h1
      class="font-headline text-4xl text-center text-white mb-10 drop-shadow-lg"
    >
      Словник Потіків
      <span class="block mt-2 text-2xl font-light"
        >Що і як часто говорять ведучі</span
      >
    </h1>

    <div
      class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-purple-100"
    >
      <label
        for="word-input"
        class="block font-default text-lg font-medium text-purple-900 mb-3"
      >
        Яке слово цікавить?
      </label>
      <div class="flex mb-5">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Напишіть будь-яке слово..."
          class="font-default flex-1 py-3 px-4 bg-white/80 border border-purple-200 rounded-l-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-purple-900 placeholder-purple-300"
          @keyup.enter="analyzeWord"
        />
        <button
          @click="analyzeWord"
          :disabled="!searchWord.trim()"
          class="font-default bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-3 px-8 rounded-r-lg transition duration-300 shadow-md"
        >
          Знайти
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <p class="font-default font-medium text-purple-900">
          Часті слова ведучих:
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(word, index) in commonWords"
            :key="index"
            class="font-default px-4 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full cursor-pointer hover:from-purple-200 hover:to-pink-200 transition duration-200 border border-purple-200/50 shadow-sm"
            @click="selectCommonWord(word)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <WordChart v-if="activeWord" :word="activeWord" />

    <div
      v-else
      class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-purple-100"
    >
      <h2
        class="font-headline text-2xl text-purple-900 mb-5 border-b border-purple-100 pb-3"
      >
        Як це працює
      </h2>
      <p class="font-default text-purple-800 mb-5 leading-relaxed">
        Цей інструмент допоможе зрозуміти, як часто і в якому контексті ведучі
        Потіків використовують різні слова. Просто введіть слово, яке вас
        цікавить.
      </p>
      <p class="font-default font-medium text-purple-900 mb-3">
        Ви дізнаєтесь:
      </p>
      <ul class="list-disc pl-6 mb-6 space-y-3">
        <li class="font-default text-purple-800">
          Як змінювалась частота вживання слова з часом
        </li>
        <li class="font-default text-purple-800">
          Хто з ведучих найчастіше його використовує
        </li>
        <li class="font-default text-purple-800">
          Почуєте реальні приклади з епізодів
        </li>
      </ul>
      <p
        class="font-default text-purple-700 italic bg-purple-50 p-4 rounded-lg border-l-4 border-purple-300"
      >
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
