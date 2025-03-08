<template>
  <div class="foo">
    <slot></slot>
  </div>
</template>

<style scoped>
.foo {
  min-height: 100vh;
  background: linear-gradient(-45deg, #c864ff, #ff64c8, #64b4ff, #b264ff);
  background-size: 100% 800%;
  background-position: 250% 150%;
  background-attachment: fixed;
}
</style>
