# Photographs, and who has to agree

Working notes, not legal advice. Not published — `media/` sits outside `docs/`.

This site sells **children's birthday parties for ages 5 to 12** and workshops
for adults. Both produce photographs of other people, so the question is not
whether a picture is good. It is who is in it.

The research-side guidance for the Clown project lives in the `clown`
repository under `ethics/`. This file is the version for the commercial pages,
because this is where a photograph of a child would actually be reached for.

## The rule

| In the frame | Before it goes on the site |
|---|---|
| Titania alone | nothing needed |
| A **child** | the guardian's **written** agreement, naming this use |
| An adult participant | that person's agreement |
| A fellow performer | that colleague's agreement — usually easy, still ask |
| Someone else's artwork | the artist's permission. Being the subject is not a licence |

A child cannot consent. The GDPR treats children's data as meriting specific
protection, and "the parent was standing there and did not object" is not
agreement — it is an absence of objection to being photographed, which is a
different thing from agreement to publication.

## The party already takes photographs

`events.md` promises every child a printed photo, and group pictures on
request. That is the business working as intended, and it is also a camera
pointed at children every time. The printed photo the family takes home needs
nothing. **Publishing the same frame does.**

So the release is worth handing over with the booking confirmation rather than
asking for on the day, when everyone is busy and a parent is being asked to
decide in a doorway.

## The archive

`100 procenta budni/`, outside both repositories, holds 68 photographs and 6
videos. Several contain identifiable children — one has Titania on a slackline
holding a five-year-old's hands, with more children watching. The full triage
is in the `clown` repository's `ethics/README.md`.

`../media-archive/originals/` holds the 31 photographs the old WordPress site
published. Being published once is not consent either: a fellow performer and
a workshop participant are in those frames too, and neither was asked.

## What is on the site, and why it is so little

`docs/.vitepress/media.data.ts` carries 26 frames. Twenty-one are frames
Titania appears in **alone** — that is the selection rule, applied to both
archives by `make-media.mjs`, which lists exactly which source file became
which published frame. Five are the films on the YouTube channel, which she
published herself and whose posters are already public at `i.ytimg.com`.

Excluded from the archives, and worth naming so nobody re-derives them by
accident:

| Frame | Why |
|---|---|
| the workshop group photographs | a dozen identifiable participants, none asked |
| the slackline, the exercise ball, the bubble show | children in frame |
| the juggling pass, the street handstand | a second performer, clearly identifiable |
| the stage clip with the musician | a colleague in the background, unlit but there |
| the trampoline and gym videos | bystanders and children |
| the Instagram screenshot | somebody else's account, handle and words |
| the clown line drawings | somebody else's artwork; being the subject is not a licence |

Published from `100 procenta budni/`: two clips — Titania alone in a Viennese
park, and alone across a city square. Both were checked frame by frame.

## The two frames that break the rule

They were on the site before any of this existed, and taking them down is not
a decision to make quietly on somebody's behalf:

| Frame | Was | Who else is in it |
|---|---|---|
| `juggling-pass` | the photograph on the About page, and still the schema.org Person image | a second person, clearly identifiable, and a third person's hands |
| `impact-hub` | the photograph on the Work with Titania page, and still the Open Graph card for it | a seated audience, several identifiable, including a child |

Both are marked `consentOwed` in `media.data.ts`, so **every build prints
them**:

```
media: 45 placements across 12 pages. 2 frame(s) still owe consent
  juggling-pass: a second person, clearly identifiable, is in the frame
  impact-hub: a seated audience, several of them identifiable, including a child
```

That is the whole mechanism. Nothing is silently excused and nothing is
silently removed; the debt is in front of whoever builds the site until it is
paid or the frames are dropped. `juggling-pass` is the same photograph as
`bf2c4943610a52c9` in the archive, which the rule excluded — so the site was
already publishing what the rule refuses. Worth knowing before trusting the
rule to describe the site.

## Frames from Instagram and Facebook

`scripts/feed-sync.mjs` turns posts into frames. Two things about them are
different from everything else here, and both are visible:

**They carry one caption in three languages.** A post is written in whichever
language it was written in, and it stands in all three — so a German reader may
meet an English sentence under an Instagram photograph. The alternative is a
machine translation nobody wrote.

**Nobody vetted who is in them.** The consent rule above is applied by a person
looking at a photograph. A sync is not a person. Anything pulled from a feed
has had the same look taken at it as the account owner took before posting it,
which is a real judgement but not this one. If the accounts contain workshop
photographs — and they do — syncing will put participants on the site.

## What this costs the site, in case it is worth fixing

`workshop` is the tag the home page most wants, and among photographs it is
carried by `juggling-pass` alone — the one that owes consent. Every other
workshop photograph has participants in it. `children` reaches balloons and a
camera rather than a child.

Both gaps close the moment a release is signed — one field in `media.data.ts`,
no code — and neither closes any other way.