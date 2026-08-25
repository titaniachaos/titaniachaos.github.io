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
    // The sponsorship card fills the slot the default theme reserves for Carbon
    // ads -- our own message, no third-party script -- and repeats after the
    // content, because that aside is display:none below 1280px and would hide
    // the only support CTA from every phone, tablet and small laptop. The CSS
    // shows exactly one of the two.
    h(DefaultTheme.Layout, null, {
      'aside-ads-before': () => h(SupportCard, { place: 'aside' }),
      'doc-after': () => h(SupportCard, { place: 'inline' })
    })
}
