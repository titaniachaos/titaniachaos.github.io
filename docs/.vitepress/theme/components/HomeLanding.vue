<script setup lang="ts">
import { computed } from 'vue'

type HomeLang = 'en' | 'de' | 'bg'

const props = withDefaults(defineProps<{ lang?: HomeLang }>(), { lang: 'en' })

const COPY = {
  en: {
    pathsEyebrow: 'Two ways in',
    pathsTitle: 'What brings you here?',
    bookTitle: 'Book Titania',
    bookBody: 'Performances, playful photography and shared experiences built around connection, improvisation and humour.',
    bookAction: 'Explore ways to work together',
    workshopTitle: 'Join a workshop',
    workshopBody: 'Open clown workshops in Vienna for adults aged 15 to 115. Beginners and people with theatre experience are equally welcome.',
    workshopAction: 'See workshops and dates',
    projectsEyebrow: 'In development',
    projectsTitle: 'Current artistic projects',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'People bring textiles and the stories they carry. The pieces are measured and joined into a growing analogue archive intended to reach the length of the Earth’s equator. Created by Bianca Trappl; accompanied since 2025 by Titania as ambassador and performative partner.',
    aequatorAction: 'Explore Äquatormaßband',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'A wordless clown solo about being alone together. The project asks whether a clown can make an audience experience solitude—while depending on contact with the room.',
    soloAction: 'Enter the project',
    support: 'Support the project',
    outcomesEyebrow: 'What the work creates',
    outcomesTitle: 'Play. Connect. Reset.',
    playTitle: 'Play',
    playBody: 'Discover comic presence through improvisation, physical comedy and the pleasure of not knowing what comes next.',
    connectTitle: 'Connect',
    connectBody: 'Meet people through attention, trust and shared laughter.',
    resetTitle: 'Reset',
    resetBody: 'Leave everyday pressure behind and rediscover lightness, energy and joy.',
    contactEyebrow: 'Start a conversation',
    contactTitle: 'Bookings & enquiries',
    contactBody: 'Invite Titania to an event or ask about a workshop, performance or playful photo experience.',
    contactAction: 'Contact Titania',
    cameraAlt: 'Titania Chaos with the time-travelling camera and its costume collection',
    workshopAlt: 'Participants playing together in a clown workshop',
    aequatorAlt: 'Titania Chaos performing with the Äquatormaßband textile work',
    soloAlt: 'Titania Chaos on stage during the development of her wordless clown solo'
  },
  de: {
    pathsEyebrow: 'Zwei Wege',
    pathsTitle: 'Was führt Sie hierher?',
    bookTitle: 'Titania buchen',
    bookBody: 'Performances, spielerische Fotografie und gemeinsame Erlebnisse rund um Verbindung, Improvisation und Humor.',
    bookAction: 'Möglichkeiten der Zusammenarbeit',
    workshopTitle: 'Workshop besuchen',
    workshopBody: 'Offene Clown-Workshops in Wien für Erwachsene von 15 bis 115 Jahren. Anfängerinnen und Menschen mit Theatererfahrung sind gleichermaßen willkommen.',
    workshopAction: 'Workshops und Termine',
    projectsEyebrow: 'In Entwicklung',
    projectsTitle: 'Aktuelle künstlerische Projekte',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'Menschen bringen Textilien und die Geschichten, die in ihnen leben. Die Beiträge werden vermessen und zu einem wachsenden analogen Archiv verbunden, das einmal den Erdumfang erreichen soll. Ein Projekt von Bianca Trappl; seit 2025 begleitet von Titania als Botschafterin und performative Partnerin.',
    aequatorAction: 'Äquatormaßband entdecken',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'Ein wortloses Clown-Solo über das gemeinsame Alleinsein. Das Projekt fragt, ob ein Clown das Publikum Einsamkeit erleben lassen kann—obwohl er vom Kontakt mit dem Raum lebt.',
    soloAction: 'Zum Projekt',
    support: 'Projekt unterstützen',
    outcomesEyebrow: 'Was die Arbeit eröffnet',
    outcomesTitle: 'Spielen. Verbinden. Auftanken.',
    playTitle: 'Spielen',
    playBody: 'Entdecken Sie komische Präsenz durch Improvisation, physische Komik und die Freude am Nichtwissen.',
    connectTitle: 'Verbinden',
    connectBody: 'Begegnen Sie Menschen durch Aufmerksamkeit, Vertrauen und gemeinsames Lachen.',
    resetTitle: 'Auftanken',
    resetBody: 'Lassen Sie den Alltagsdruck hinter sich und entdecken Sie Leichtigkeit, Energie und Freude wieder.',
    contactEyebrow: 'Ein Gespräch beginnen',
    contactTitle: 'Buchungen & Anfragen',
    contactBody: 'Laden Sie Titania zu einer Veranstaltung ein oder fragen Sie nach einem Workshop, einer Performance oder einem spielerischen Fotoerlebnis.',
    contactAction: 'Titania kontaktieren',
    cameraAlt: 'Titania Chaos mit der zeitreisenden Kamera und ihrer Kostümsammlung',
    workshopAlt: 'Teilnehmende spielen gemeinsam in einem Clown-Workshop',
    aequatorAlt: 'Titania Chaos performt mit dem textilen Werk Äquatormaßband',
    soloAlt: 'Titania Chaos auf der Bühne während der Entwicklung ihres wortlosen Clown-Solos'
  },
  bg: {
    pathsEyebrow: 'Два пътя',
    pathsTitle: 'Какво ви води тук?',
    bookTitle: 'Поканете Титания',
    bookBody: 'Представления, игрова фотография и споделени преживявания, изградени около свързването, импровизацията и хумора.',
    bookAction: 'Вижте възможностите',
    workshopTitle: 'Включете се в работилница',
    workshopBody: 'Отворени клоунски работилници във Виена за възрастни от 15 до 115 години. Начинаещите и хората с театрален опит са еднакво добре дошли.',
    workshopAction: 'Работилници и дати',
    projectsEyebrow: 'В развитие',
    projectsTitle: 'Настоящи артистични проекти',
    aequatorTitle: 'Äquatormaßband × Titania Chaos',
    aequatorBody: 'Хората носят текстил и историите, които той пази. Материалите се измерват и свързват в растящ аналогов архив, замислен да достигне дължината на земния екватор. Проект на Бианка Трапл; от 2025 г. Титания участва като посланик и пърформативен партньор.',
    aequatorAction: 'Разгледайте Äquatormaßband',
    soloTitle: 'Solo Titania Chaos',
    soloBody: 'Безсловесно клоунско соло за това да бъдем сами заедно. Проектът пита дали един клоун може да накара публиката да преживее самотата—докато самият той зависи от контакта с нея.',
    soloAction: 'Към проекта',
    support: 'Подкрепете проекта',
    outcomesEyebrow: 'Какво създава работата',
    outcomesTitle: 'Игра. Свързване. Презареждане.',
    playTitle: 'Игра',
    playBody: 'Открийте комичното присъствие чрез импровизация, физическа комедия и удоволствието да не знаете какво следва.',
    connectTitle: 'Свързване',
    connectBody: 'Срещнете хора чрез внимание, доверие и споделен смях.',
    resetTitle: 'Презареждане',
    resetBody: 'Оставете ежедневното напрежение зад гърба си и открийте отново лекотата, енергията и радостта.',
    contactEyebrow: 'Начало на разговор',
    contactTitle: 'Резервации и запитвания',
    contactBody: 'Поканете Титания на събитие или попитайте за работилница, представление или игрово фотопреживяване.',
    contactAction: 'Пишете на Титания',
    cameraAlt: 'Титания Хаос с пътуващия във времето фотоапарат и колекцията му от костюми',
    workshopAlt: 'Участници играят заедно в клоунска работилница',
    aequatorAlt: 'Титания Хаос изпълнява пърформанс с текстилната творба Äquatormaßband',
    soloAlt: 'Титания Хаос на сцена по време на разработването на безсловесното си клоунско соло'
  }
} as const

const t = computed(() => COPY[props.lang])
const prefix = computed(() => (props.lang === 'en' ? '' : `/${props.lang}`))
const aequatorLink = computed(() => 'https://titaniachaos.com/aequator/')
const soloLink = computed(() => `https://titaniachaos.com/clown/${props.lang === 'en' ? '' : `${props.lang}/`}`)
</script>

<template>
  <main class="home-landing">
    <section class="home-section home-paths" aria-labelledby="home-paths-title">
      <p class="home-eyebrow">{{ t.pathsEyebrow }}</p>
      <h2 id="home-paths-title">{{ t.pathsTitle }}</h2>
      <div class="home-path-grid">
        <article class="home-path-card home-path-card--primary">
          <div class="home-path-card__copy">
            <h3>{{ t.bookTitle }}</h3>
            <p>{{ t.bookBody }}</p>
            <a class="home-button home-button--brand" :href="`${prefix}/work-with-titania`">{{ t.bookAction }}</a>
          </div>
          <img src="/images/media/camera-portrait.webp" :alt="t.cameraAlt" loading="lazy">
        </article>
        <article class="home-path-card">
          <div class="home-path-card__copy">
            <h3>{{ t.workshopTitle }}</h3>
            <p>{{ t.workshopBody }}</p>
            <a class="home-button home-button--secondary" :href="`${prefix}/workshops`">{{ t.workshopAction }}</a>
          </div>
          <img src="/images/media/workshop-mini-art.webp" :alt="t.workshopAlt" loading="lazy">
        </article>
      </div>
    </section>

    <section class="home-section home-projects" aria-labelledby="home-projects-title">
      <p class="home-eyebrow">{{ t.projectsEyebrow }}</p>
      <h2 id="home-projects-title">{{ t.projectsTitle }}</h2>
      <div class="home-project-list">
        <article class="home-project-card">
          <img src="/images/media/aequator-skirt-dance.webp" :alt="t.aequatorAlt" loading="lazy">
          <div class="home-project-card__copy">
            <h3>{{ t.aequatorTitle }}</h3>
            <p>{{ t.aequatorBody }}</p>
            <div class="home-project-card__actions">
              <a class="home-text-link" :href="aequatorLink">{{ t.aequatorAction }} <span aria-hidden="true">→</span></a>
              <a class="home-text-link home-text-link--support" href="https://revolut.me/titaniachaos" target="_blank" rel="noopener noreferrer">{{ t.support }}</a>
            </div>
          </div>
        </article>
        <article class="home-project-card home-project-card--reverse">
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
    </section>

    <section class="home-section home-outcomes" aria-labelledby="home-outcomes-title">
      <p class="home-eyebrow">{{ t.outcomesEyebrow }}</p>
      <h2 id="home-outcomes-title">{{ t.outcomesTitle }}</h2>
      <div class="home-outcome-grid">
        <article><h3>{{ t.playTitle }}</h3><p>{{ t.playBody }}</p></article>
        <article><h3>{{ t.connectTitle }}</h3><p>{{ t.connectBody }}</p></article>
        <article><h3>{{ t.resetTitle }}</h3><p>{{ t.resetBody }}</p></article>
      </div>
    </section>

    <section class="home-contact" aria-labelledby="home-contact-title">
      <p class="home-eyebrow">{{ t.contactEyebrow }}</p>
      <h2 id="home-contact-title">{{ t.contactTitle }}</h2>
      <p>{{ t.contactBody }}</p>
      <a class="home-button home-button--brand" href="mailto:agent@tatianapetkova.com">{{ t.contactAction }}</a>
    </section>
  </main>
</template>
