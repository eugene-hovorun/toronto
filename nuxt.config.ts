import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    prerender: {
      routes: ["/word/кастомний"], // Prerender the default word route
    },
  },
  app: {
    head: {
      title: "Кастомний аналізатор",
      link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
      viewport: "width=device-width, initial-scale=1, maximum-scale=1",
    },
  },
});
