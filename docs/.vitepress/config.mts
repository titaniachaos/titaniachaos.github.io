import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en',
  title: 'Titania Chaos',
  titleTemplate: ':title | Titania Chaos',
  description: 'Clown workshops, physical comedy, events and parties in Vienna.',
  cleanUrls: true,
  sitemap: { hostname: 'https://titaniachaos.github.io' },
  head: [
    ['meta', { name: 'theme-color', content: '#d62246' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Titania Chaos' }],
    ['meta', { property: 'og:image', content: 'https://titaniachaos.github.io/images/titania-chaos.webp' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Workshops', link: '/' },
      { text: 'Birthdays', link: '/events/' },
      { text: 'Work with Titania', link: '/work-with-titania/' },
      { text: 'About', link: '/about-titania/' },
      { text: 'Clown Project', link: '/clown/' }
    ],
    sidebar: {
      '/clown/': [
        {
          text: 'Solo Titania Chaos 2026',
          items: [
            { text: 'Project Home', link: '/clown/' },
            { text: 'Artistic Concept', link: '/clown/concept' },
            { text: 'Audience Relationship', link: '/clown/audience' },
            { text: 'Dramaturgy', link: '/clown/dramaturgy' },
            { text: 'Studio Process', link: '/clown/studio-process' },
            { text: 'Rehearsal Toolkit', link: '/clown/rehearsal-toolkit' },
            { text: 'Material Research', link: '/clown/material-research' },
            { text: 'Production', link: '/clown/production' },
            { text: 'About the Project', link: '/clown/about' }
          ]
        }
      ]
    },
    search: { provider: 'local' },
    footer: {
      message: 'Photos by Veliko Balabanov, Marine Hink, Heidi Holtl, Geo Kalev, Tanya Matskevich, Konstantin Oberlik, Tatiana Petkova, Marion Scholz and Laurent Ziegler. · <a href="/legal-data">Legal notice & privacy</a>',
      copyright: '© 2022–2026 Titania Chaos'
    },
    socialLinks: [
      { icon: 'instagram', link: 'https://www.instagram.com/titaniachaos' },
      { icon: 'facebook', link: 'https://www.facebook.com/titaniachaos' }
    ],
    outline: { level: [2, 3] }
  }
})
