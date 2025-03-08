<template>
  <div class="word-analysis-page">
    <h1>Podcast Speech Analysis</h1>

    <div class="search-container">
      <label for="word-input">Enter a word to analyze:</label>
      <div class="input-wrapper">
        <input
          id="word-input"
          v-model="searchWord"
          type="text"
          placeholder="Enter word..."
          @keyup.enter="analyzeWord"
        />
        <button @click="analyzeWord" :disabled="!searchWord.trim()">
          Analyze
        </button>
      </div>

      <div class="common-words">
        <p>Common words:</p>
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

    <WordChart :word="activeWord" v-if="activeWord" />

    <div class="instructions" v-else>
      <h2>Instructions</h2>
      <p>
        Enter a word in the search box to analyze its usage across all podcast
        episodes.
      </p>
      <p>The analysis will show:</p>
      <ul>
        <li>Frequency of the word in each episode</li>
        <li>Which speakers use the word most often</li>
        <li>Time distribution (at what point in episodes the word appears)</li>
        <li>Example contexts where the word is used</li>
      </ul>
      <p>You can also click on the common words above for quick analysis.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// Common words to provide as shortcuts
const commonWords = [
  "Україна",
  "війна",
  "донат",
  "потік",
  "гроші",
  "збір",
  "книжка",
];

const searchWord = ref("");
const activeWord = ref("");

const analyzeWord = () => {
  if (searchWord.value.trim()) {
    activeWord.value = searchWord.value.trim();
  }
};

const selectCommonWord = (word) => {
  searchWord.value = word;
  activeWord.value = word;
};
</script>

<style scoped>
.word-analysis-page {
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
