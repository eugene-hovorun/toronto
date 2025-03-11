<template>
  <AppLayout>
    <div class="container">
      <NuxtPage />
    </div>
  </AppLayout>

  <Analytics />
</template>

<script lang="ts" setup>
import { Analytics } from "@vercel/analytics/nuxt";
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
}

body {
  overflow-y: scroll;
  overflow-x: hidden;
}

.container {
  width: 100%;
  max-width: 1024px;
  margin: 0 auto;
  padding: 0 10px;
}

/* Add responsive base font size */
@media (max-width: 640px) {
  html {
    font-size: 14px;
  }
}
</style>
