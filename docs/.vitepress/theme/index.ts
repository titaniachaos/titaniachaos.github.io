import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import SupportCard from './SupportCard.vue'
import WorkshopDates from './WorkshopDates.vue'
import SocialWall from './SocialWall.vue'
import VideoFacade from './VideoFacade.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VideoFacade', VideoFacade)
    app.component('WorkshopDates', WorkshopDates)
    app.component('SocialWall', SocialWall)
  },
  Layout: () =>
    // Rendered after the page content rather than in the aside: the aside is
    // display:none below 1280px, which hid the only support CTA from every
    // phone, tablet and small laptop.
    h(DefaultTheme.Layout, null, {
      'doc-after': () => h(SupportCard)
    })
}
