import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import SupportCard from './SupportCard.vue'
import WorkshopDates from './WorkshopDates.vue'
import SocialWall from './SocialWall.vue'
import MediaHero from './MediaHero.vue'
import MediaFigure from './MediaFigure.vue'
import MediaCategory from './MediaCategory.vue'
import MediaIndex from './MediaIndex.vue'
import JournalIndex from './JournalIndex.vue'
import PageTopics from './PageTopics.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('WorkshopDates', WorkshopDates)
    app.component('SocialWall', SocialWall)
    app.component('MediaHero', MediaHero)
    app.component('MediaFigure', MediaFigure)
    app.component('MediaCategory', MediaCategory)
    app.component('MediaIndex', MediaIndex)
    app.component('JournalIndex', JournalIndex)
  },
  Layout: () =>
    // The sponsorship card fills the slot the default theme reserves for Carbon
    // ads -- our own message, no third-party script -- and repeats after the
    // content, because that aside is display:none below 1280px and would hide
    // the only support CTA from every phone, tablet and small laptop. The CSS
    // shows exactly one of the two.
    h(DefaultTheme.Layout, null, {
      'aside-ads-before': () => h(SupportCard, { place: 'aside' }),
      // What the page is about, then the ask. A reader who has finished the
      // page should be offered somewhere to go before being offered a
      // donation. PageTopics renders nothing on a page with no figures.
      'doc-after': () => [h(PageTopics), h(SupportCard, { place: 'inline' })]
    })
}
