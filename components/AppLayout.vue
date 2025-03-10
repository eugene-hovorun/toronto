<!-- AppLayout.vue -->
<template>
  <div class="gradient">
    <div class="container mx-auto px-4 py-8">
      <slot></slot>
    </div>

    <footer class="py-6 mt-auto">
      <div class="container mx-auto px-4">
        <div class="text-right">
          <p class="text-white text-sm font-default opacity-70">
            З повагою
            <a
              href="mailto:5797565@gmail.com"
              class="underline hover:text-purple-200 transition-colors"
              >5797565@gmail.com</a
            >
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.gradient {
  display: flex;
  flex-direction: column;
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
  animation: gradient-animation 26s ease infinite;
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
