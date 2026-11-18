---
title: Да поиграем отново!
description: Три часа клоунстване с Титания в София на 4.12.26 от 17:00 ч.
layout: false
robots: noindex, nofollow
search: false
---

<script setup>
import { onMounted, onUnmounted, watchPostEffect } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()

// The root route defaults to English. Keep the standalone invitation in Bulgarian after hydration.
onMounted(() => {
  watchPostEffect(() => { document.documentElement.lang = 'bg' })
})
onUnmounted(() => { document.documentElement.lang = lang.value })
</script>

<main class="sofia-invitation" lang="bg">
  <div class="sofia-masthead">
    <a class="sofia-brand" href="/bg/">Titania Chaos</a>
    <a class="sofia-language" href="#english" lang="en">Read in English</a>
  </div>
  <header class="sofia-poster">
    <div class="sofia-poster-copy">
      <p class="sofia-kicker">Клоунско ателие · София</p>
      <h1>Да поиграем отново!</h1>
      <p class="sofia-subtitle">Три часа клоунстване с Титания в София</p>
      <p class="sofia-details">
        <strong>Петък, 4 декември 2026 г., 17:00–20:00 ч.</strong><br>
        <a class="sofia-venue-link" href="https://nexusspace.eu" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/></svg><span>Nexus Space | Urban recovery hub</span></a><br>
        <a class="sofia-venue-link" href="https://www.google.com/maps/search/?api=1&amp;query=%D1%83%D0%BB.+%D0%9A%D0%BD%D1%8F%D0%B7+%D0%91%D0%BE%D1%80%D0%B8%D1%81+I+121%2C+%D0%A1%D0%BE%D1%84%D0%B8%D1%8F" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>ул. „Княз Борис I“ №121, София</span></a><br>
        До метро „Сердика“, изход „Западна порта“<br>
      </p>
    </div>
    <img class="sofia-portrait" src="/images/sofia-clown-invitation.webp" width="600" height="995" alt="Титания с микрофон и вдигната ръка">
  </header>
  <div class="sofia-letter">
    <p>Ехо!</p>
    <p>Отново съм в София! Хайде да се съберем за три часа игра, импровизация и смях. Ще се разтоварим от напрежението, за да си върнем усещането за лекота и радост.</p>
    <p><strong>Какво ще правим?</strong></p>
    <p>Чрез игри и упражнения ще търсим комичното в обикновените ситуации и начини да се свързваме със себе си и с другите. Освен това ще се нарадваме на собствената си глупост и човечност. С една дума – ще е яко!</p>
    <p>Не е нужен опит в театъра или клоунадата. Работилницата е за любители и професионалисти.</p>
    <p>Ела с удобни дрехи, в които можеш да се движиш свободно.</p>
    <p>Ако още не сме играли заедно, виж <a class="sofia-info-link" href="/bg/workshops">повече за клоунските ми работилници</a>.</p>
    <p>Участието е отворено за всички поканени, независимо от възможността за плащане. Ако можеш и искаш да дадеш нещо, 35 € са ориентир. Сумата избираш самостоятелно, а плащането е през <a class="sofia-payment" href="https://revolut.me/titaniachaos">Revolut</a> или в брой на място.</p>
    <a class="contact-button" href="mailto:agent@tatianapetkova.com?subject=%D0%98%D1%81%D0%BA%D0%B0%D0%BC%20%D0%B4%D0%B0%20%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B2%D0%B0%D0%BC%20%D0%B2%20%D0%BA%D0%BB%D0%BE%D1%83%D0%BD%D1%81%D0%BA%D0%B0%D1%82%D0%B0%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B8%D0%BB%D0%BD%D0%B8%D1%86%D0%B0%20%D0%B2%20%D0%A1%D0%BE%D1%84%D0%B8%D1%8F">Искам да участвам!</a>
    <p class="sofia-registration-note">За записване е достатъчен и празен имейл — ще ти отговоря с потвърждение.</p>
  </div>
  <section id="english" lang="en" tabindex="-1" aria-labelledby="english-title">
    <h2 id="english-title">Let’s play again!</h2>
    <p class="sofia-subtitle">Three hours of clowning with Titania in Sofia</p>
    <p>Hey!</p>
    <p>I’m back in Sofia! Let’s get together for three hours of play, improvisation and laughter. We’ll let go of tension and rediscover a sense of ease and joy.</p>
    <p><strong>What will we do?</strong></p>
    <p>Through games and exercises, we’ll look for the funny side of everyday situations and ways to connect with ourselves and each other. We’ll also revel in our own silliness and humanity. In a word — it’ll be awesome!</p>
    <p>No theatre or clowning experience is needed. The workshop is for amateurs and professionals alike.</p>
    <p>Wear comfortable clothes that let you move freely.</p>
    <p class="sofia-details">
      <strong>Friday, 4 December 2026, 17:00–20:00 (Sofia time)</strong><br>
      <a class="sofia-venue-link" href="https://nexusspace.eu" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/></svg><span>Nexus Space | Urban recovery hub</span></a><br>
        <a class="sofia-venue-link" href="https://www.google.com/maps/search/?api=1&amp;query=%D1%83%D0%BB.+%D0%9A%D0%BD%D1%8F%D0%B7+%D0%91%D0%BE%D1%80%D0%B8%D1%81+I+121%2C+%D0%A1%D0%BE%D1%84%D0%B8%D1%8F" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>121 Knyaz Boris I Street, Sofia</span></a><br>
        Near Serdika metro station, “West Gate” exit<br>
    </p>
    <p>If we haven’t played together before, <a class="sofia-info-link" href="/workshops">read more about my clown workshops</a>.</p>
    <p>Everyone invited is welcome, whatever they can afford. If you’d like to contribute, €35 is a guide. You can choose your own amount and pay via <a class="sofia-payment" href="https://revolut.me/titaniachaos">Revolut</a> or in cash on the day.</p>
    <a class="contact-button" href="mailto:agent@tatianapetkova.com?subject=%D0%98%D1%81%D0%BA%D0%B0%D0%BC%20%D0%B4%D0%B0%20%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B2%D0%B0%D0%BC%20%D0%B2%20%D0%BA%D0%BB%D0%BE%D1%83%D0%BD%D1%81%D0%BA%D0%B0%D1%82%D0%B0%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B8%D0%BB%D0%BD%D0%B8%D1%86%D0%B0%20%D0%B2%20%D0%A1%D0%BE%D1%84%D0%B8%D1%8F">I’d like to join!</a>
    <p class="sofia-registration-note">An empty email is enough to sign up — I’ll reply to confirm your place.</p>
  </section>
  <figure class="sofia-workshop-photo">
    <img src="/images/media/workshop-sofia.webp" width="520" height="292" loading="lazy" alt="Участници в клоунско ателие в София позират заедно">
  </figure>
</main>

<style>
.sofia-invitation {
  max-width: 64rem;
  margin-inline: auto;
  padding: clamp(1rem, 4vw, 3rem);
  font-size: 1.0625rem;
  line-height: 1.65;
}
.sofia-masthead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}
.sofia-masthead .sofia-brand {
  font-size: 1rem;
  font-weight: 600;
}
.sofia-masthead .sofia-brand:hover { color: var(--vp-c-brand-1); }
.sofia-invitation .sofia-language,
.sofia-invitation .sofia-payment,
.sofia-invitation .sofia-info-link {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.sofia-invitation .sofia-language { font-size: 0.875rem; }
.sofia-invitation .sofia-venue-link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4em;
  max-width: 100%;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.sofia-venue-link svg {
  flex: 0 0 1em;
  width: 1em;
  height: 1em;
  align-self: flex-start;
  margin-top: 0.3em;
}
.sofia-poster .sofia-venue-link:focus-visible {
  outline-color: currentColor;
}
.sofia-poster {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  align-items: center;
  background: #a51c39;
  color: #fff7ed;
}
.sofia-poster-copy { padding: clamp(1.25rem, 5vw, 3.5rem); }
.sofia-poster .sofia-kicker {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.sofia-invitation h1 {
  margin: 0.3em 0 0;
  font-size: clamp(2.65rem, 7vw, 5.25rem);
  font-weight: 800;
  letter-spacing: -0.065em;
  line-height: 0.99;
}
.sofia-invitation h2 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 750;
  line-height: 1.1;
  letter-spacing: -0.04em;
}
.sofia-invitation p { margin: 0.85rem 0; }
.sofia-invitation .sofia-subtitle { font-weight: 600; }
.sofia-poster .sofia-details {
  margin-bottom: 0;
  padding-top: 0.9rem;
  border-top: 1px solid #fff7ed80;
  font-size: 0.95rem;
}
.sofia-poster .sofia-portrait {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
  object-position: center top;
}
.sofia-letter,
.sofia-invitation #english {
  max-width: 39rem;
  margin: clamp(1.75rem, 5vw, 3.5rem) auto 0;
}
.sofia-letter p:first-child {
  color: var(--vp-c-brand-1);
  font-size: 1.7rem;
  font-weight: 750;
}
.sofia-invitation #english {
  padding-top: 1.5rem;
  border-top: 2px solid var(--vp-c-brand-1);
  scroll-margin-top: 1rem;
}
.sofia-workshop-photo {
  max-width: 39rem;
  margin: clamp(1.75rem, 5vw, 3.5rem) auto 0;
}
.sofia-workshop-photo img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 520 / 244;
  object-fit: cover;
}
.sofia-invitation .sofia-registration-note {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}
.sofia-invitation :focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}
@media (max-width: 640px) {
  .sofia-poster { grid-template-columns: minmax(0, 1fr); }
  .sofia-poster .sofia-portrait {
    height: auto;
    max-height: 19rem;
  }
}
</style>
