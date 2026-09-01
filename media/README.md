# Photographs, and who has to agree

Working notes, not legal advice. Not published — `media/` sits outside `docs/`.

This site sells **children's birthday parties for ages 5 to 12** and workshops
for adults. Both produce photographs of other people, so the question is not
whether a picture is good. It is who is in it.

The research-side guidance for the Clown project lives in the `clown`
repository under `ethics/`. This file is the version for the commercial pages,
because this is where a photograph of a child would actually be reached for.

## The forms

`photo-consent-en.md`, `photo-consent-de.md` and `photo-consent-bg.md` are the
releases. They were rewritten to be strict enough to be useful: the old ones
asked only about "the website", which does not license an Instagram post, and
covered children's parties only — while most of the archive is adults.

Each now names every destination separately (website, the social accounts by
handle, press, funder applications), says plainly that the platforms are run by
companies outside the EU and that a picture posted there can be copied beyond
recall, and comes in two forms: adults, and children signed for by a guardian.
Bulgarian is there because the Sofia workshops are where it actually gets
signed.

They are working notes, not legal advice. Have a lawyer read them before they
are used in earnest.

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

## Everything is imported. Almost nothing is published.

The whole of both archives is now in the repository — 111 frames. That was
deliberate: importing and publishing are different acts, and only the first is
a job for a script.

- **30 are published.** They appear on pages, in categories and in
  `/media.json`.
- **81 are drafts.** They have been derived and are tracked, and they appear on
  no page, in no category and in no index. Every build lists them.

A draft stays a draft until somebody writes its alt text and caption in three
languages and deletes its `draft: true`. The build refuses to publish a frame
whose words still say `TODO`, so a half-finished record cannot slip out.

## What is in each frame

Every frame that has somebody other than Titania in it says so, in
`othersInFrame`, in its own words — "a child, clearly identifiable", "about a
dozen workshop participants", "a musician in the background". Of the 139 frames
in the archive, **52 record another person**, and every build prints all 52.

A frame may also carry `heldBack`, which is a reason rather than an unfinished
record: `draft: true` on its own means the words are unwritten, while
`heldBack` means somebody decided this one does not go out — another artist's
work, another organisation's mark, or the archive owner's own refusal. Those
are printed separately, because "still a draft" reads as unfinished and these
are not.

That field is not a verdict. It is a note of what a person would see, written
down so that the decision to publish is made by someone who can weigh it
against the signed forms — not by a filename, and not by whoever is running the
import script.

Two published frames also carry it, and predate all of this:

| Frame | Who else is in it |
|---|---|
| `juggling-pass` | a second person, clearly identifiable, and a third person's hands |
| `impact-hub` | a seated audience, several identifiable, including a child |

Every build prints the list:

```
media: 81 frame(s) imported and waiting for their words
media: 47 frame(s) still owe consent (media/README.md)
```

## One thing to know about the draft files

A draft is derived into `docs/public/images/media`, which is served. It is on
no page and in no index, so nothing links to it and nothing lists it — but the
file is fetchable by anyone who knows or guesses the URL, and it is in a public
git repository. That is the price of "import everything into shared storage",
and it is worth knowing before the frames with children in them stay drafts for
long.

Deleting a frame's record and re-running `node media/make-media.mjs` removes
the derived files with it.
