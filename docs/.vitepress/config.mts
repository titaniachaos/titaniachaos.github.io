import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Clown',
  description: 'A creative workspace for Solo Titania Chaos 2026',
  base: '/clown/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about' }
    ],
    socialLinks: []
  }
})
