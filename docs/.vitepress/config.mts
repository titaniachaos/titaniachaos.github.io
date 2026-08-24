import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Titania Chaos',
  description: 'Clown workshops, physical comedy, events and parties in Vienna.',
  cleanUrls: true,
  head: [['meta', { name: 'theme-color', content: '#d62246' }]],
  themeConfig: {
    nav: [
      { text: 'Workshops', link: '/' },
      { text: 'Birthdays', link: '/events/' },
      { text: 'Work with Titania', link: '/work-with-titania/' },
      { text: 'About', link: '/about-titania/' },
      { text: 'Clown project', link: '/clown/' }
    ],
    footer: { message: 'Photos by Veliko Balabanov, Marine Hink, Heidi Holtl, Geo Kalev, Tanya Matskevich, Konstantin Oberlik, Tatiana Petkova, Marion Scholz and Laurent Ziegler.', copyright: '© 2022–2026 Titania Chaos' },
    socialLinks: [
      { icon: 'instagram', link: 'https://www.instagram.com/titaniachaos' },
      { icon: 'facebook', link: 'https://www.facebook.com/titaniachaos' }
    ],
    outline: { level: [2, 3] }
  }
})
