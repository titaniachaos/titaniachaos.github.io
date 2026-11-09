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
        София · залата ще бъде уточнена<br>
        Продължителност: 3 часа · Група: 7–15 участници
      </p>
    </div>
    <img class="sofia-portrait" src="/images/sofia-clown-invitation.webp" width="600" height="995" alt="Титания с микрофон и вдигната ръка">
  </header>
  <div class="sofia-letter">
    <p>Ехо!</p>
    <p>Отново ще бъда в София и ми се иска да се съберем за три часа игра, импровизация, открития и неочаквани срещи.</p>
    <p>Ще пробваме как една пауза, един поглед или една грешка могат да обърнат цялата сцена. А ако нещо се обърка, още по-добре: оттам често започва номерът.</p>
    <p>Участието е отворено за всички поканени, независимо от възможността за плащане. Ако можеш и искаш да дадеш нещо, 35 € са ориентир. Сумата избираш самостоятелно, а плащането е през <a class="sofia-payment" href="https://revolut.me/titaniachaos">Revolut</a> или в брой на място.</p>
    <a class="contact-button" href="mailto:agent@tatianapetkova.com?subject=%D0%98%D1%81%D0%BA%D0%B0%D0%BC%20%D0%B4%D0%B0%20%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B2%D0%B0%D0%BC%20%D0%B2%20%D0%BA%D0%BB%D0%BE%D1%83%D0%BD%D1%81%D0%BA%D0%B0%D1%82%D0%B0%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B8%D0%BB%D0%BD%D0%B8%D1%86%D0%B0%20%D0%B2%20%D0%A1%D0%BE%D1%84%D0%B8%D1%8F">Искам да участвам!</a>
  </div>
  <section id="english" lang="en" tabindex="-1" aria-labelledby="english-title">
    <h2 id="english-title">Let’s play again!</h2>
    <p class="sofia-subtitle">Three hours of clowning with Titania in Sofia</p>
    <p>Hey!</p>
    <p>I’ll be in Sofia again, and I’d love to get together for three hours of play, improvisation, discoveries and unexpected encounters.</p>
    <p>We’ll see how a pause, a glance or a mistake can turn a whole scene around. And if something goes wrong, even better: that’s often where the act begins.</p>
    <p class="sofia-details">
      <strong>Friday, 4 December 2026, 17:00–20:00 (Sofia time)</strong><br>
      Sofia · venue to be confirmed<br>
      Duration: 3 hours · Group size: 7–15 participants
    </p>
    <p>Everyone invited is welcome, whatever they can afford. If you’d like to contribute, €35 is a guide. You can choose your own amount and pay via <a class="sofia-payment" href="https://revolut.me/titaniachaos">Revolut</a> or in cash on the day.</p>
    <a class="contact-button" href="mailto:agent@tatianapetkova.com?subject=%D0%98%D1%81%D0%BA%D0%B0%D0%BC%20%D0%B4%D0%B0%20%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B2%D0%B0%D0%BC%20%D0%B2%20%D0%BA%D0%BB%D0%BE%D1%83%D0%BD%D1%81%D0%BA%D0%B0%D1%82%D0%B0%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B8%D0%BB%D0%BD%D0%B8%D1%86%D0%B0%20%D0%B2%20%D0%A1%D0%BE%D1%84%D0%B8%D1%8F">I’d like to join!</a>
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
.sofia-invitation .sofia-payment {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.sofia-invitation .sofia-language { font-size: 0.875rem; }
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
