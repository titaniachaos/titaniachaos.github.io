import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import SupportCard from './SupportCard.vue'
import WorkshopDates from './WorkshopDates.vue'
import SocialWall from './SocialWall.vue'
import MediaHero from './MediaHero.vue'
import MediaFigure from './MediaFigure.vue'
import BrowsePath from './BrowsePath.vue'
import LocalePreference from './LocalePreference.vue'
import NotFound from './NotFound.vue'
import Arrangement from './Arrangement.vue'
import UiBadge from './ui/UiBadge.vue'
import UiButton from './ui/UiButton.vue'
import UiLabel from './ui/UiLabel.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Arrangement', Arrangement)
    // Ported primitives, registered globally so a Markdown page can reach them
    // as well as a component can. `enhanceApp` is the documented place for
    // this; the styling is in custom.css, which is the documented place for
    // that.
    app.component('UiBadge', UiBadge)
    app.component('UiButton', UiButton)
    app.component('UiLabel', UiLabel)
    app.component('WorkshopDates', WorkshopDates)
    app.component('SocialWall', SocialWall)
    app.component('MediaHero', MediaHero)
    app.component('MediaFigure', MediaFigure)
    app.component('BrowsePath', BrowsePath)
  },
  Layout: () =>
    // The sponsorship card fills the slot the default theme reserves for Carbon
    // ads -- our own message, no third-party script -- and repeats after the
    // content, because that aside is display:none below 1280px and would hide
    // the only support CTA from every phone, tablet and small laptop. The CSS
    // shows exactly one of the two.
    h(DefaultTheme.Layout, null, {
      'layout-top': () => h(LocalePreference),
      // A path here is a question, so an address that answers nothing is a
      // question rather than a wall: it redirects when the same question has a
      // listing under another order, renders the listing when the archive can
      // answer it, and only says "not found" for a word the archive does not
      // use. This is the slot the default theme renders -- a top-level
      // `NotFound` on the theme object is only the router's fallback for a
      // missing page module, and never reaches the 404 screen.
      'not-found': () => h(NotFound),
      'aside-ads-before': () => h(SupportCard, { place: 'aside' }),
      'doc-after': () => h(SupportCard, { place: 'inline' })
    })
}
