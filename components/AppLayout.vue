<!-- AppLayout.vue -->
<template>
  <div class="gradient">
    <div class="container mx-auto px-4 py-8">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.gradient {
  min-height: 100vh;
  background: linear-gradient(
    -45deg,
    rgba(200, 100, 255, 0.7),
    rgba(255, 100, 200, 0.6),
    rgba(100, 180, 255, 0.7),
    rgba(178, 100, 255, 0.6)
  );
  background-size: 400% 400%;
  background-position: 0% 50%;
  background-attachment: fixed;
  animation: gradient-animation 25s ease infinite;
}

@keyframes gradient-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
