<template>
  <WordAnalysis :initialWord="word" />
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

// Get the route parameter
const route = useRoute();
const word = computed(() => (route.params.word as string) || "кастомний");
</script>
