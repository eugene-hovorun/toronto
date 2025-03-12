<script setup lang="ts">
import { computed } from "vue";
import { formatUtils, colorUtils } from "~/utils";
import type { WordAnalysisData } from "~/types";

const props = defineProps<{
  wordData: WordAnalysisData | null;
  word: string;
}>();

// Use utility functions
const { formatEpisodeDate, formatTimecode, highlightWord } = formatUtils;
const { getSpeakerColors } = colorUtils;

// Get speaker colors
const SPEAKER_COLORS = getSpeakerColors();

// Helper computed properties and methods
const contexts = computed(() => {
  return props.wordData?.contexts || [];
});

// Highlight word in main speech (excluding conversational context)
const highlightMainSpeech = (text: string, searchWord: string): string => {
  let mainSpeech = text;

  // Remove conversational context for main speech display
  if (text.includes("\n\nConversational context:")) {
    mainSpeech = text.split("\n\nConversational context:")[0];
  } else if (text.includes("(Context: ")) {
    mainSpeech = text.replace(/\s*\(Context: .*?\)$/, "");
  }

  return highlightWord(mainSpeech, searchWord);
};

const getSpeakerColor = (speaker: string): string => {
  // Use the predefined color from SPEAKER_COLORS if available
  // Otherwise fall back to the default purple color
  return SPEAKER_COLORS[speaker] || "#6B21A8"; // Default purple color as fallback
};
</script>

<template>
  <div class="mt-6 sm:mt-8 pb-16 pt-2" v-if="contexts.length">
    <h4
      class="font-headline text-lg sm:text-xl text-white drop-shadow-md mb-3 sm:mb-4 px-2"
    >
      Як це звучить у контексті:
    </h4>
    <div class="space-y-4">
      <div
        v-for="(context, index) in contexts.slice(0, 5)"
        :key="index"
        class="bg-white/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-sm border border-purple-100/30 transition-all hover:bg-white/70"
      >
        <div class="flex flex-col sm:flex-row sm:gap-4">
          <!-- Thumbnail with timecode underneath -->
          <div
            class="relative flex-shrink-0 w-full sm:w-28 sm:h-28 h-36 overflow-hidden rounded-md mb-3 sm:mb-0"
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
                alt="Прев'ю"
                class="w-full h-full object-cover"
              />
            </a>
            <!-- Improved timecode with episode indicator -->
            <div
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white py-1 flex justify-center items-center px-2"
            >
              <span class="text-xs">{{ formatTimecode(context.time) }}</span>
            </div>
          </div>

          <!-- Context text and metadata -->
          <div class="flex-grow overflow-hidden">
            <!-- Enhanced metadata with more visibility -->
            <div
              class="flex justify-between items-center mb-2 sm:mb-3 text-xs border-b border-purple-100/30 pb-2"
            >
              <span
                class="text-xs sm:text-sm font-headline font-medium px-2 py-1 rounded-full"
                :style="`color: ${getSpeakerColor(context.speaker)};`"
                >{{ context.speaker }}</span
              >
              <span class="text-gray-500">{{
                formatEpisodeDate(context.episode)
              }}</span>
            </div>

            <!-- Main context section -->
            <div class="font-default">
              <!-- Main speech content -->
              <div
                class="text-sm sm:text-base text-gray-800 leading-relaxed pb-3"
              >
                <p v-html="highlightMainSpeech(context.text, word)"></p>
              </div>
            </div>

            <!-- Enhanced controls -->
            <div class="flex justify-between items-center mt-3">
              <!-- Listen link -->
              <div v-if="context.youtubeLink" class="flex">
                <a
                  :href="context.youtubeLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1 transition-colors bg-purple-100/40 hover:bg-purple-100/70 px-2 py-1 rounded-full"
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
</template>
