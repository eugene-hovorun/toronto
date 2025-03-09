<template>
  <div class="word-analysis-page">
    <h1>Аналіз промов у подкасті</h1>

    <div class="search-container">
      <label for="word-input">Введіть слово для аналізу:</label>
      <div class="input-wrapper">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Введіть слово..."
          @keyup.enter="analyzeWord"
        />
        <button @click="analyzeWord" :disabled="!searchWord.trim()">
          Аналізувати
        </button>
      </div>

      <div class="common-words">
        <p>Популярні слова:</p>
        <div class="word-tags">
          <span
            v-for="(word, index) in commonWords"
            :key="index"
            class="word-tag"
            @click="selectCommonWord(word)"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <WordChart v-if="activeWord" :word="activeWord" />

    <div class="instructions" v-else>
      <h2>Інструкції</h2>
      <p>
        Введіть слово в пошукове поле, щоб проаналізувати його вживання в усіх
        епізодах подкасту.
      </p>
      <p>Аналіз покаже:</p>
      <ul>
        <li>Частоту вживання слова в кожному епізоді</li>
        <li>Які спікери найчастіше використовують це слово</li>
        <li>Приклади контексту, де вживається слово</li>
      </ul>
      <p>
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

<style scoped>
.word-analysis-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.search-container {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.input-wrapper {
  display: flex;
  margin-bottom: 15px;
}

input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}

button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #2980b9;
}

button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.common-words {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.common-words p {
  margin: 0;
  font-weight: bold;
}

.word-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-tag {
  padding: 5px 10px;
  background-color: #e0f7fa;
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.word-tag:hover {
  background-color: #b2ebf2;
}

.instructions {
  margin-top: 40px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.instructions h2 {
  color: #2c3e50;
  margin-top: 0;
}

.instructions ul {
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
}
</style>
