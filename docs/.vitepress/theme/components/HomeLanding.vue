<script setup lang="ts">
import { computed } from 'vue'

type HomeLang = 'en' | 'de' | 'bg'
const props = withDefaults(defineProps<{ lang?: HomeLang }>(), { lang: 'en' })

const COPY = {
  en: {
    pageTitle: 'Titania Chaos — Clown artist in Vienna',
    projectsTitle: 'Current projects',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'A participatory textile art and peace project created by Bianca Trappl, accompanied by Titania as ambassador and performative partner.',
    aequatorAction: 'Explore Äquatormaßband',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'A wordless clown solo about being alone together, developed through contact between clown and audience.',
    soloAction: 'Explore Solo Titania Chaos',
    support: 'Support the project',
    projectsAction: 'View all projects',
    contactTitle: 'Contact',
    contactBody: 'For bookings, workshop questions and other enquiries, write directly to Titania.',
    contactAction: 'Contact Titania',
    aequatorAlt: 'Titania Chaos performing with the Äquatormaßband textile work',
    soloAlt: 'Titania Chaos on stage during the development of her wordless clown solo'
  },
  de: {
    pageTitle: 'Titania Chaos — Clownkünstlerin in Wien',
    projectsTitle: 'Aktuelle Projekte',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'Ein partizipatives Textilkunst- und Friedensprojekt von Bianca Trappl, begleitet von Titania als Botschafterin und performative Partnerin.',
    aequatorAction: 'Äquatormaßband entdecken',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'Ein wortloses Clown-Solo über das gemeinsame Alleinsein, entwickelt im Kontakt zwischen Clown und Publikum.',
    soloAction: 'Solo Titania Chaos entdecken',
    support: 'Projekt unterstützen',
    projectsAction: 'Alle Projekte ansehen',
    contactTitle: 'Kontakt',
    contactBody: 'Für Buchungen, Fragen zu Workshops und andere Anliegen schreiben Sie Titania direkt.',
    contactAction: 'Titania kontaktieren',
    aequatorAlt: 'Titania Chaos performt mit dem textilen Werk Äquatormaßband',
    soloAlt: 'Titania Chaos auf der Bühne während der Entwicklung ihres wortlosen Clown-Solos'
  },
  bg: {
    pageTitle: 'Титания Хаос — клоун и артист във Виена',
    projectsTitle: 'Актуални проекти',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'Партиципативен проект за текстилно изкуство и мир, създаден от Бианка Трапл, с Титания като посланик и пърформативен партньор.',
    aequatorAction: 'Разгледайте Äquatormaßband',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'Безсловесно клоунско соло за това да бъдем сами заедно, развито чрез контакта между клоуна и публиката.',
    soloAction: 'Разгледайте Solo Titania Chaos',
    support: 'Подкрепете проекта',
    projectsAction: 'Вижте всички проекти',
    contactTitle: 'Контакт',
    contactBody: 'За резервации, въпроси за работилници и други запитвания пишете директно на Титания.',
    contactAction: 'Пишете на Титания',
    aequatorAlt: 'Титания Хаос играе пърформанс с текстилната творба Äquatormaßband',
    soloAlt: 'Титания Хаос на сцена по време на разработването на своето безсловесно клоунско соло'
  }
} as const

const t = computed(() => COPY[props.lang])
const prefix = computed(() => (props.lang === 'en' ? '' : `/${props.lang}`))
const soloLink = computed(() => `https://titaniachaos.com/clown/${props.lang === 'en' ? '' : `${props.lang}/`}`)
</script>

<template>
  <main class="home-landing">
    <h1 class="home-sr-only">{{ t.pageTitle }}</h1>
    <section class="home-section home-projects" aria-labelledby="home-projects-title">
      <h2 id="home-projects-title">{{ t.projectsTitle }}</h2>
      <div class="home-project-list">
        <article class="home-project-card">
          <img src="/images/media/aequator-skirt-dance.webp" :alt="t.aequatorAlt" loading="lazy">
          <div class="home-project-card__copy">
            <h3>{{ t.aequatorTitle }}</h3>
            <p>{{ t.aequatorBody }}</p>
            <div class="home-project-card__actions">
              <a class="home-text-link" href="https://titaniachaos.com/aequator/">{{ t.aequatorAction }} <span aria-hidden="true">→</span></a>
              <a class="home-text-link home-text-link--support" href="https://revolut.me/titaniachaos" target="_blank" rel="noopener noreferrer">{{ t.support }}</a>
            </div>
          </div>
        </article>
        <article class="home-project-card">
          <img src="/images/media/stage-balloon.webp" :alt="t.soloAlt" loading="lazy">
          <div class="home-project-card__copy">
            <h3>{{ t.soloTitle }}</h3>
            <p>{{ t.soloBody }}</p>
            <div class="home-project-card__actions">
              <a class="home-text-link" :href="soloLink">{{ t.soloAction }} <span aria-hidden="true">→</span></a>
              <a class="home-text-link home-text-link--support" href="https://revolut.me/titaniachaos" target="_blank" rel="noopener noreferrer">{{ t.support }}</a>
            </div>
          </div>
        </article>
      </div>
      <a class="home-all-projects" :href="`${prefix}/projects`">{{ t.projectsAction }} <span aria-hidden="true">→</span></a>
    </section>

    <section class="home-contact" aria-labelledby="home-contact-title">
      <h2 id="home-contact-title">{{ t.contactTitle }}</h2>
      <p>{{ t.contactBody }}</p>
      <a class="home-button home-button--brand" href="mailto:agent@tatianapetkova.com">{{ t.contactAction }}</a>
    </section>
  </main>
</template>
