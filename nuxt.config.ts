import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-07-09',
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    preset: 'static',
    output: { dir: '.output' }
  },
  app: {
    head: {
      title: 'WinStartScanner',
      meta: [
        { name: 'theme-color', content: '#000000' }
      ]
    }
  }
})
