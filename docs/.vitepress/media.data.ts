import { defineLoader } from 'vitepress'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { dimensions } from '../../scripts/lib/image-size.mjs'
import { LANGS, type Lang, type Localised } from './locale.ts'

/**
 * The picture archive, and the vocabulary the pages ask it questions with.
 *
 * Every page but the legal one carried at most one photograph, chosen by hand
 * and written into the Markdown. That does not scale to three languages: a
 * picture added to the English page is a picture missing from the German one
 * until somebody notices, and its alt text is written twice more or not at
 * all.
 *
 * So a page no longer names a picture. A section says what it is about --
 * `<MediaFigure tags="birthday children" />` -- and the archive answers, with
 * the frame that answers best. The same tags in all three languages, because a
 * tag is not a word on the page: it is a property of the photograph, and the
 * photograph is the same one in Sofia and in Vienna.
 *
 * The picture is then shown twice, and both times with words: set into the
 * prose of its own section, and again in the hero at the top of the page,
 * where its section's heading is its title and that section's first paragraph
 * is its text. The heading is demoted one level on the way -- h1 slides h2,
 * h2 slides h3 -- so the hero is a map of the page in the page's own type.
 *
 * Two consequences worth knowing before editing this file:
 *
 *   Adding a frame publishes it everywhere it fits. There is no per-page list
 *   to update, and no page where it can be forgotten.
 *
 *   Tags are a closed vocabulary. A typo is not a tag that matches nothing --
 *   it fails the build, because a tag that matches nothing is invisible.
 *
 * ---- who is in the frame ------------------------------------------------
 *
 * Everything here is a frame Titania appears in alone. That is not a style;
 * it is the whole of what consent allows today. media/README.md holds the
 * rule -- a child needs a guardian's written agreement naming this use, an
 * adult participant needs their own, a fellow performer needs asking -- and
 * the archive has none of them.
 *
 * It is why `workshop` is carried by two videos and no photograph, and why
 * `children` reaches balloons and a camera rather than a child. The good
 * workshop photographs exist. They are not here because nobody has been
 * asked yet, and asking is the fix -- not a better crop.
 */

export type { Lang } from './locale.ts'

export { TAGS, type Tag } from './categories.ts'
import { TAGS, TAG_NAMES, type Tag } from './categories.ts'

export interface Frame {
  /** Stable id. Also the file stem in /images/media and the lightbox anchor. */
  id: string
  kind: 'photo' | 'video'
  tags: Tag[]
  /** What someone who cannot see it needs to know. Required in all three. */
  alt: Localised
  /** What someone who can see it might not know. Required in all three. */
  caption: Localised
  /** The maker of this specific work when the global photography credit does not apply. */
  creator?: string
  /** The length of the clip, in whole seconds. Every film is self-hosted. */
  seconds?: number
  /**
   * Where the face is, for every crop that has to throw part of the frame
   * away: the square tile, and any `object-fit: cover` at display size.
   *
   * The default follows entropy, and entropy is not a face -- it kept the
   * balloons and cut the head off the person holding them. This is declared
   * rather than detected because there is no face detection here and a guess
   * that is right most of the time is worse than a value someone looked at.
   *
   * Used by media/make-media.mjs for the square and by the components for
   * `object-position`, so the crop is the same shape whatever the screen.
   */
  focus?: 'top' | 'centre' | 'bottom' | 'left top' | 'right top'
  /**
   * Imported, derived and tracked — but not published, because its alt text
   * and caption have not been written yet.
   *
   * "Import everything" and "publish everything" are different acts, and this
   * is the difference. A draft frame is in the repository, has its files, and
   * appears in no page, no category and no index. Write its words and delete
   * this line and it is live.
   */
  draft?: true
  /**
   * Why a frame is held back, when the reason is not that nobody has written
   * its words yet.
   *
   * Six of the imported frames are not photographs of the work: a screenshot
   * of somebody else's Instagram post, another organisation's logo, a framed
   * drawing by another artist, an unattributed illustration, an occasion this
   * archive cannot name, and one that is a decision about what this project
   * says in public rather than a decision about tagging. Written down because
   * "still a draft" reads as unfinished, and these are not unfinished.
   */
  heldBack?: string
  /** Where the frame came from. Everything unmarked is the picture archive. */
  source?: 'youtube' | 'site' | 'instagram' | 'facebook'
  /**
   * Where this came from, when it came from somewhere with an address: the
   * YouTube watch page for the five films, the post for a synced photograph.
   * The bytes are served from here; the link is so the channel and the
   * accounts keep the traffic, and so a viewer can see the original.
   */
  permalink?: string
  /**
   * Who else is in the frame, in plain words -- "a child, clearly
   * identifiable", "a musician in the background".
   *
   * Not a verdict and not a debt: the releases for this archive are held. It
   * is a record of what a person would see, kept because a filename cannot
   * tell you that a photograph has a child in it, and because knowing which
   * frames those are is what makes a withdrawal request answerable in minutes
   * rather than by scrolling.
   */
  othersInFrame?: string
}

/** A frame after the loader has measured it. */
export interface Media extends Frame {
  file: string
  /** The square the category listings use. */
  tile: string
  /** `object-position` for any display-time cover crop, from `focus`. */
  anchor: string
  mp4?: string
  width: number
  height: number
}

/** A page, as a category listing needs to link to it. */
export interface PageRef {
  lang: Lang
  slug: string
  path: string
  title: string
}

export interface Data {
  media: Media[]
  /** Every figure on every page, keyed `${lang}/${slug}`, in document order. */
  placements: Record<string, Placement[]>
  /**
   * The reverse of `placements`: for each frame, the pages that show it, per
   * language. A category page is a listing of a tag, and the useful thing to
   * say under each picture is where else on the site it turns up -- which is
   * internal linking the site never had, generated rather than written.
   */
  usedOn: Record<string, PageRef[]>
  /**
   * What each written page is about, keyed `${lang}/${slug}`.
   *
   * A section already says what it is about, in the vocabulary, when it asks
   * for a picture: `<MediaFigure tags="birthday children" />`. That statement
   * was read once, to choose a frame, and then thrown away -- so the four
   * written pages sat in a site with 42 category pages and linked to none of
   * them, and no category page could say which page discussed it.
   *
   * It is the tags the page asked for, not the tags of the frames it got: the
   * first is what the page claims to be about, the second is whatever else the
   * winning photograph happens to carry. Where a page names a frame outright
   * there is no claim to read, so the frame's own tags stand in.
   */
  pageTags: Record<string, { ref: PageRef; tags: Tag[] }>
  tags: Tag[]
  /** Tag names as a reader sees them, per language. */
  label: Record<Lang, Record<Tag, string>>
  ui: Record<Lang, {
    /** Accessible name of the hero region. */
    region: string
    photo: string
    video: string
    play: string
    previous: string
    next: string
    pause: string
    resume: string
    /** `%1 of %2`, for the slide counter read out to a screen reader. */
    position: string
    /** Link out to wherever the film or photograph was originally posted. */
    source: string
  }>
}

declare const data: Data
export { data }

// ---- the archive ---------------------------------------------------------
// Derived from media-archive/originals and the video archive by
// media/make-gallery.mjs, which records which source file became which id.

const FRAMES: Frame[] = [
  {
    id: 'workshop-mini-art',
    kind: 'video',
    seconds: 57,
    permalink: 'https://www.youtube.com/watch?v=JG4Iar3Ax7k',
    source: 'youtube',
    tags: ['workshop'],
    alt: {
      en: 'Participants in a clown workshop playing together in a bright studio',
      bg: 'Участници в клоунска работилница играят заедно в светло студио',
      de: 'Teilnehmende eines Clown-Workshops spielen gemeinsam in einem hellen Studio'
    },
    caption: {
      en: 'A clown workshop at the Mini Art Foundation, January 2024.',
      bg: 'Клоунска работилница във фондация „Мини Арт“, януари 2024.',
      de: 'Ein Clown-Workshop in der Mini Art Foundation, Jänner 2024.'
    }
  },
  {
    id: 'workshop-sofia',
    kind: 'video',
    seconds: 108,
    permalink: 'https://www.youtube.com/watch?v=oh8HroecvrA',
    source: 'youtube',
    tags: ['workshop'],
    alt: {
      en: 'A clown workshop group at work in a rehearsal room',
      bg: 'Група в клоунска работилница по време на работа в репетиционна зала',
      de: 'Eine Clown-Workshop-Gruppe bei der Arbeit in einem Probenraum'
    },
    caption: {
      en: 'A clown workshop at the Mini Art Centre in Sofia, October 2023.',
      bg: 'Клоунска работилница в Мини Арт Център, София, октомври 2023.',
      de: 'Ein Clown-Workshop im Mini Art Centre in Sofia, Oktober 2023.'
    }
  },
  {
    id: 'park-dance',
    kind: 'video',
    seconds: 10,
    tags: ['street', 'portrait', 'solitude'],
    alt: {
      en: 'Titania Chaos in a red suit and striped scarf, leaping across a sunlit park',
      bg: 'Титания Хаос в червен костюм и раиран шал прескача огрян от слънце парк',
      de: 'Titania Chaos im roten Anzug und mit Ringelschal springt durch einen sonnigen Park'
    },
    caption: {
      en: 'A Viennese park, and nobody watching. The clown does not wait for an audience.',
      bg: 'Виенски парк и никой наоколо. Клоунът не чака публика.',
      de: 'Ein Wiener Park, niemand schaut zu. Der Clown wartet nicht auf Publikum.'
    }
  },
  {
    id: 'square-cartwheel',
    kind: 'video',
    seconds: 5,
    tags: ['street', 'performance'],
    alt: {
      en: 'Titania Chaos, dressed in red, turning a cartwheel across a wide city square',
      bg: 'Титания Хаос, облечена в червено, прави колело през широк градски площад',
      de: 'Titania Chaos, ganz in Rot, schlägt ein Rad über einen weiten Stadtplatz'
    },
    caption: {
      en: 'Barefoot across a square, between the passers-by and the pigeons.',
      bg: 'Боса през площада, между минувачите и гълъбите.',
      de: 'Barfuß über einen Platz, zwischen Passanten und Tauben.'
    }
  },
  {
    id: 'balloon-heart',
    focus: 'left top',
    kind: 'photo',
    tags: ['balloons', 'children', 'birthday', 'performance'],
    alt: {
      en: 'Titania Chaos in a hat and dark glasses, holding a red heart made of balloon out to the camera',
      bg: 'Титания Хаос с шапка и тъмни очила подава към камерата червено сърце от балон',
      de: 'Titania Chaos mit Hut und dunkler Brille hält ein rotes Herz aus Luftballon in die Kamera'
    },
    caption: {
      en: 'A heart, twisted on the spot and given away immediately.',
      bg: 'Сърце, усукано на място и подарено веднага.',
      de: 'Ein Herz, an Ort und Stelle gedreht und sofort verschenkt.'
    }
  },
  {
    id: 'balloon-chain',
    focus: 'right top',
    kind: 'photo',
    tags: ['balloons', 'children', 'birthday'],
    alt: {
      en: 'Titania Chaos in red, leaning over a railing to lower a long chain of coloured balloons',
      bg: 'Титания Хаос в червено се навежда над парапет и спуска дълга верига от цветни балони',
      de: 'Titania Chaos in Rot beugt sich über ein Geländer und lässt eine lange Kette bunter Luftballons hinab'
    },
    caption: {
      en: 'The balloon chain arrives before the clown does.',
      bg: 'Веригата от балони пристига преди клоуна.',
      de: 'Die Ballonkette ist vor dem Clown da.'
    }
  },
  {
    id: 'balloon-garland',
    focus: 'right top',
    kind: 'photo',
    tags: ['balloons', 'street', 'birthday'],
    alt: {
      en: 'Titania Chaos crossing a city street carrying an armful of orange, purple and green balloons',
      bg: 'Титания Хаос пресича градска улица с наръч оранжеви, лилави и зелени балони',
      de: 'Titania Chaos überquert eine Straße mit einem Arm voll oranger, violetter und grüner Luftballons'
    },
    caption: {
      en: 'Getting to the party is already part of the party.',
      bg: 'Отиването до празника вече е част от празника.',
      de: 'Der Weg zum Fest ist schon Teil des Festes.'
    }
  },
  {
    id: 'camera-portrait',
    focus: 'left top',
    kind: 'photo',
    tags: ['camera', 'props'],
    alt: {
      en: 'Titania Chaos standing behind a large wooden bellows camera on a tripod, flowers on top of it',
      bg: 'Титания Хаос стои зад голяма дървена мехова камера на статив, с цветя отгоре',
      de: 'Titania Chaos steht hinter einer großen hölzernen Balgenkamera auf einem Stativ, Blumen darauf'
    },
    caption: {
      en: 'The time-travelling camera, waiting for its next century.',
      bg: 'Машината на времето, в очакване на следващия си век.',
      de: 'Die Zeitreisekamera wartet auf ihr nächstes Jahrhundert.'
    }
  },
  {
    id: 'traveller-kit',
    focus: 'centre',
    kind: 'photo',
    tags: ['camera', 'props'],
    alt: {
      en: 'A wooden case marked TIME TRAVELLER on a floor, with a folded umbrella, a red hat and a leather box',
      bg: 'Дървен куфар с надпис TIME TRAVELLER на пода, сгънат чадър, червена шапка и кожена кутия',
      de: 'Ein Holzkoffer mit der Aufschrift TIME TRAVELLER am Boden, dazu ein Schirm, ein roter Hut und eine Lederschachtel'
    },
    caption: {
      en: 'Everything the time traveller needs, and nothing she does not.',
      bg: 'Всичко, което е нужно на пътешественика във времето, и нищо повече.',
      de: 'Alles, was die Zeitreisende braucht, und nichts darüber hinaus.'
    }
  },
  {
    id: 'stage-collar',
    focus: 'left top',
    kind: 'photo',
    tags: ['stage', 'portrait'],
    alt: {
      en: 'Titania Chaos in a dark dress with a wide white collar, red nose and round glasses, a red curtain behind her',
      bg: 'Титания Хаос в тъмна рокля с широка бяла яка, червен нос и кръгли очила, пред червена завеса',
      de: 'Titania Chaos in dunklem Kleid mit breitem weißen Kragen, roter Nase und runder Brille vor einem roten Vorhang'
    },
    caption: {
      en: 'Before the curtain, before the first laugh.',
      bg: 'Пред завесата, преди първия смях.',
      de: 'Vor dem Vorhang, vor dem ersten Lachen.'
    }
  },
  {
    id: 'stage-balloon',
    focus: 'right top',
    kind: 'photo',
    tags: ['stage', 'solitude'],
    alt: {
      en: 'Titania Chaos on a dark stage in a pale grey dress, holding a single balloon on an open hand',
      bg: 'Титания Хаос на тъмна сцена в бледосива рокля държи един балон на отворена длан',
      de: 'Titania Chaos auf dunkler Bühne im blassgrauen Kleid hält einen einzelnen Luftballon auf der offenen Hand'
    },
    caption: {
      en: 'One balloon, held out for as long as the silence lasts.',
      bg: 'Един балон, поднесен толкова дълго, колкото трае тишината.',
      de: 'Ein Luftballon, so lange hingehalten, wie die Stille dauert.'
    }
  },
  {
    id: 'stage-gown',
    focus: 'centre',
    kind: 'photo',
    tags: ['stage', 'solitude'],
    alt: {
      en: 'Titania Chaos on a dark stage, opening out the wide skirt of a pale gown with both hands',
      bg: 'Титания Хаос на тъмна сцена разтваря с две ръце широката пола на бледа рокля',
      de: 'Titania Chaos auf dunkler Bühne breitet mit beiden Händen den weiten Rock eines hellen Kleides aus'
    },
    caption: {
      en: 'A dress is also a prop, if you hold it long enough.',
      bg: 'Роклята също е реквизит, ако я държиш достатъчно дълго.',
      de: 'Ein Kleid ist auch eine Requisite, wenn man es lange genug hält.'
    }
  },
  {
    id: 'telephone',
    focus: 'right top',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: {
      en: 'Titania Chaos in a houndstooth jacket at a wooden counter, listening into an antique telephone',
      bg: 'Титания Хаос в сако на пепит до дървен плот слуша в антикварен телефон',
      de: 'Titania Chaos im Hahnentritt-Sakko an einem Holztresen lauscht in ein altes Telefon'
    },
    caption: {
      en: 'Someone is on the line. It has been a while.',
      bg: 'Някой е на линията. Мина доста време.',
      de: 'Jemand ist in der Leitung. Es ist eine Weile her.'
    }
  },
  {
    id: 'wall-coat',
    focus: 'left top',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: {
      en: 'Titania Chaos against a concrete wall in a tweed coat over a pale blue dress, looking upwards',
      bg: 'Титания Хаос пред бетонна стена, с туидово палто върху бледосиня рокля, гледа нагоре',
      de: 'Titania Chaos vor einer Betonwand im Tweedmantel über hellblauem Kleid, den Blick nach oben'
    },
    caption: {
      en: 'Waiting is a whole scene, if you are honest about it.',
      bg: 'Чакането е цяла сцена, ако си честен с него.',
      de: 'Warten ist eine ganze Szene, wenn man ehrlich damit ist.'
    }
  },
  {
    id: 'beanie-portrait',
    focus: 'left top',
    kind: 'photo',
    tags: ['portrait', 'street', 'solitude'],
    alt: {
      en: 'A close portrait of Titania Chaos in a yellow beanie and round glasses, eyes wide, red nose on',
      bg: 'Близък портрет на Титания Хаос с жълта шапка и кръгли очила, с широко отворени очи и червен нос',
      de: 'Nahes Porträt von Titania Chaos mit gelber Mütze und runder Brille, weit aufgerissene Augen, rote Nase'
    },
    caption: {
      en: 'The nose is the smallest mask in the theatre, and the hardest to hide behind.',
      bg: 'Носът е най-малката маска в театъра и най-трудната за криене зад нея.',
      de: 'Die Nase ist die kleinste Maske des Theaters — und die, hinter der man sich am wenigsten verstecken kann.'
    }
  },
  {
    id: 'shadow',
    focus: 'left top',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: {
      en: 'The shadow of Titania Chaos thrown on a pale wall, hat and open hand in silhouette',
      bg: 'Сянката на Титания Хаос върху бледа стена — шапка и отворена длан в силует',
      de: 'Der Schatten von Titania Chaos an heller Wand, Hut und offene Hand als Silhouette'
    },
    caption: {
      en: 'The clown arrives on the wall first.',
      bg: 'Клоунът пристига първо на стената.',
      de: 'Der Clown kommt zuerst an der Wand an.'
    }
  },
  {
    id: 'doorway-jump',
    focus: 'centre',
    kind: 'photo',
    tags: ['street', 'portrait', 'solitude'],
    alt: {
      en: 'Titania Chaos in a red boilersuit jumping in a doorway, arms and legs spread wide',
      bg: 'Титания Хаос в червен гащеризон скача в рамката на врата с широко разперени ръце и крака',
      de: 'Titania Chaos im roten Overall springt in einem Türrahmen, Arme und Beine weit gespreizt'
    },
    caption: {
      en: 'A doorway is a frame, and a frame is an invitation.',
      bg: 'Вратата е рамка, а рамката е покана.',
      de: 'Eine Tür ist ein Rahmen, und ein Rahmen ist eine Einladung.'
    }
  },
  {
    id: 'bench-balance',
    focus: 'left top',
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: {
      en: 'Titania Chaos in a red dress balancing on one foot along the edge of a park bench',
      bg: 'Титания Хаос в червена рокля балансира на един крак по ръба на пейка в парка',
      de: 'Titania Chaos im roten Kleid balanciert auf einem Bein auf der Kante einer Parkbank'
    },
    caption: {
      en: 'Any edge will do, if you agree to take it seriously.',
      bg: 'Всеки ръб върши работа, стига да се съгласиш да го приемеш сериозно.',
      de: 'Jede Kante genügt, wenn man bereit ist, sie ernst zu nehmen.'
    }
  },
  {
    id: 'barrel-street',
    focus: 'centre',
    kind: 'photo',
    tags: ['street', 'performance'],
    alt: {
      en: 'Titania Chaos in a red boilersuit standing on a painted barrel in a city square, one arm raised',
      bg: 'Титания Хаос в червен гащеризон стои върху рисувана бъчва на градски площад с вдигната ръка',
      de: 'Titania Chaos im roten Overall steht auf einer bemalten Tonne auf einem Stadtplatz, ein Arm erhoben'
    },
    caption: {
      en: 'A metre of height is enough to turn a pavement into a stage.',
      bg: 'Един метър височина стига, за да превърне тротоара в сцена.',
      de: 'Ein Meter Höhe genügt, um aus einem Gehsteig eine Bühne zu machen.'
    }
  },
  {
    id: 'statue-embrace',
    focus: 'centre',
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: {
      en: 'Titania Chaos with a red nose embracing a bronze statue on a pedestrian street, a second red nose on the statue',
      bg: 'Титания Хаос с червен нос прегръща бронзова статуя на пешеходна улица; втори червен нос е сложен на статуята',
      de: 'Titania Chaos mit roter Nase umarmt eine Bronzestatue in einer Fußgängerzone; auch die Statue trägt eine rote Nase'
    },
    caption: {
      en: 'Nobody is too bronze for a red nose.',
      bg: 'Никой не е прекалено бронзов за червен нос.',
      de: 'Niemand ist zu bronzen für eine rote Nase.'
    }
  },
  {
    id: 'radio-studio',
    focus: 'left top',
    kind: 'photo',
    tags: ['press'],
    alt: {
      en: 'Tatiana Petkova in a checked shirt at a radio studio desk, a microphone arm in front of her',
      bg: 'Татяна Петкова в карирана риза на пулта в радиостудио, пред нея стойка с микрофон',
      de: 'Tatiana Petkova im Karohemd am Pult eines Radiostudios, vor ihr ein Mikrofonarm'
    },
    caption: {
      en: 'On air, out of costume: the clown explained rather than performed.',
      bg: 'В ефир, без костюм: клоунът обяснен, вместо изигран.',
      de: 'Auf Sendung, ohne Kostüm: der Clown erklärt statt gespielt.'
    }
  },
  {
    id: 'showreel',
    kind: 'video',
    seconds: 55,
    permalink: 'https://www.youtube.com/watch?v=OL9f3qKXE1I',
    source: 'youtube',
    tags: ['workshop', 'performance'],
    alt: {
      en: 'A workshop group in red noses, clowning around Titania Chaos in a studio',
      bg: 'Група от работилница с червени носове клоунства около Титания Хаос в студио',
      de: 'Eine Workshop-Gruppe mit roten Nasen albert im Studio um Titania Chaos herum'
    },
    caption: {
      en: 'The film that introduces the work, from the Titania Chaos channel.',
      bg: 'Филмът, който представя работата, от канала на Титания Хаос.',
      de: 'Der Film, der die Arbeit vorstellt, vom Titania-Chaos-Kanal.'
    }
  },
  {
    id: 'django-tribute',
    kind: 'video',
    seconds: 205,
    permalink: 'https://www.youtube.com/watch?v=VJuf0huu2X4',
    source: 'youtube',
    tags: ['performance', 'street', 'portrait'],
    alt: {
      en: 'Titania Chaos in a red dress outdoors, singing into a toy microphone',
      bg: 'Титания Хаос в червена рокля на открито пее в детски микрофон',
      de: 'Titania Chaos im roten Kleid im Freien, singt in ein Spielzeugmikrofon'
    },
    caption: {
      en: '“Smile” — a tribute to Django Edwards, 2023.',
      bg: '„Smile“ — почит към Джанго Едуардс, 2023.',
      de: '„Smile“ — eine Hommage an Django Edwards, 2023.'
    }
  },
  {
    id: 'banana-encore',
    kind: 'video',
    seconds: 73,
    permalink: 'https://www.youtube.com/watch?v=w3wkwyrTRiY',
    source: 'youtube',
    tags: ['performance', 'stage'],
    alt: {
      en: 'Titania Chaos in a long coat outdoors, holding a banana handed up from the audience',
      bg: 'Титания Хаос в дълго палто на открито държи банан, подаден от публиката',
      de: 'Titania Chaos im langen Mantel im Freien, mit einer Banane aus dem Publikum'
    },
    caption: {
      en: 'The banana arrives from the audience, mid-performance with Äquatormassband. Vienna, November 2025.',
      bg: 'Бананът идва от публиката, по време на представление с Äquatormassband. Виена, ноември 2025.',
      de: 'Die Banane kommt aus dem Publikum, mitten im Auftritt mit der Äquatormassband. Wien, November 2025.'
    }
  },
  {
    id: 'juggling-pass',
    focus: 'centre',
    kind: 'photo',
    source: 'site',
    othersInFrame: 'a second person, clearly identifiable, is in the frame',
    tags: ['juggling', 'street', 'workshop'],
    alt: {
      en: 'Titania Chaos in a red dress outdoors, a pink juggling club spinning above her open hands',
      bg: 'Титания Хаос в червена рокля на открито, розова бухалка се върти над отворените ѝ длани',
      de: 'Titania Chaos im roten Kleid im Freien, eine rosa Jonglierkeule dreht sich über ihren offenen Händen'
    },
    caption: {
      en: 'A club in the air between two people is a conversation, not a trick.',
      bg: 'Бухалка във въздуха между двама души е разговор, не трик.',
      de: 'Eine Keule in der Luft zwischen zwei Menschen ist ein Gespräch, kein Trick.'
    }
  },
  {
    id: 'impact-hub',
    focus: 'right top',
    kind: 'photo',
    source: 'site',
    othersInFrame: 'a seated audience, several of them identifiable, including a child',
    tags: ['performance', 'stage'],
    alt: {
      en: 'Titania Chaos performing at the top of a staircase to a seated audience in a bright hall',
      bg: 'Титания Хаос играе на върха на стълбище пред седнала публика в светла зала',
      de: 'Titania Chaos spielt am Kopf einer Treppe vor sitzendem Publikum in einem hellen Saal'
    },
    caption: {
      en: 'A staircase makes a stage, and a room full of strangers makes an audience.',
      bg: 'Стълбището става сцена, а стая, пълна с непознати — публика.',
      de: 'Eine Treppe wird zur Bühne, ein Raum voller Fremder zum Publikum.'
    }
  },
  {
    id: 'blue-corner',
    focus: 'left top',
    kind: 'photo',
    tags: ['portrait', 'stage', 'solitude'],
    alt: {
      en: 'Titania Chaos in a red polka-dot suit, braced barefoot across the corner of a blue-painted alcove',
      bg: 'Титания Хаос в червен костюм на точки, боса, се е подпряла в ъгъла на синя ниша',
      de: 'Titania Chaos im rot gepunkteten Anzug, barfuß in die Ecke einer blau gestrichenen Nische gestemmt'
    },
    caption: {
      en: 'A corner is the smallest room there is, and it still holds a whole person.',
      bg: 'Ъгълът е най-малката стая, а пак побира цял човек.',
      de: 'Eine Ecke ist der kleinste Raum, den es gibt — und fasst trotzdem einen ganzen Menschen.'
    }
  },
  {
    id: 'dressing-room',
    focus: 'right top',
    kind: 'photo',
    tags: ['portrait', 'stage', 'solitude'],
    alt: {
      en: 'Titania Chaos in a pale green dress and red nose, seated at a lit dressing-room mirror',
      bg: 'Титания Хаос в бледозелена рокля и с червен нос, седнала пред осветено гримьорно огледало',
      de: 'Titania Chaos in hellgrünem Kleid mit roter Nase, sitzend vor einem beleuchteten Garderobenspiegel'
    },
    caption: {
      en: 'The last quiet before the room fills. The nose is already on.',
      bg: 'Последната тишина, преди залата да се напълни. Носът вече е сложен.',
      de: 'Die letzte Stille, bevor der Saal sich füllt. Die Nase sitzt schon.'
    }
  },
  {
    id: 'harbour-bollard',
    focus: 'centre',
    kind: 'photo',
    tags: ['portrait', 'street', 'solitude'],
    alt: {
      en: 'Titania Chaos balanced on a harbour bollard against a bright sky, arms out, the sea behind her',
      bg: 'Титания Хаос балансира върху кнехт на пристанището на фона на светло небе, с разперени ръце и море зад нея',
      de: 'Titania Chaos balanciert auf einem Hafenpoller vor hellem Himmel, die Arme ausgebreitet, dahinter das Meer'
    },
    caption: {
      en: 'Alone on a metre of iron, with the whole harbour to fall into.',
      bg: 'Сама върху метър желязо, с цяло пристанище, в което да падне.',
      de: 'Allein auf einem Meter Eisen, mit einem ganzen Hafen zum Hineinfallen.'
    }
  },
  {
    id: 'empty-room',
    focus: 'centre',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: {
      en: 'Titania Chaos in a red hooded coat, standing alone in an empty rehearsal room',
      bg: 'Титания Хаос в червено палто с качулка, сама в празна репетиционна зала',
      de: 'Titania Chaos im roten Kapuzenmantel, allein in einem leeren Probenraum'
    },
    caption: {
      en: 'An empty room is not nothing. It is the thing the work has to fill.',
      bg: 'Празната зала не е нищо. Тя е онова, което работата трябва да запълни.',
      de: 'Ein leerer Raum ist nicht nichts. Er ist das, was die Arbeit füllen muss.'
    }
  },
  {
    id: 'a-06077ced0b10175c',
    kind: 'photo',
    tags: ['street', 'performance', 'props'],
    othersInFrame: 'a fellow performer, clearly identifiable, and passers-by in the background',
    alt: { en: 'Titania Chaos in a red dress standing at a stone parapet while a fellow performer holds a handstand beside a hoop', bg: 'Титания Хаос в червена рокля до каменен парапет, докато друг артист прави стойка на ръце до обръч', de: 'Titania Chaos im roten Kleid an einer Steinbrüstung, daneben hält ein Kollege einen Handstand neben einem Reifen' },
    caption: { en: 'A pitch on the street is whatever furniture the street already has.', bg: 'Сцената на улицата е това, което улицата вече е сложила там.', de: 'Die Bühne auf der Straße ist das, was die Straße schon hingestellt hat.' }
  },
  {
    id: 'a-0679147602f4d57d',
    kind: 'photo',
    tags: ['props', 'solitude'],
    alt: { en: 'A watercolour palette, brushes and a blank spiral notebook on a wooden table, seen from above', bg: 'Палитра с акварели, четки и празен спирален бележник върху дървена маса, отгоре', de: 'Aquarellkasten, Pinsel und ein leeres Spiralheft auf einem Holztisch, von oben' },
    caption: { en: 'Before the material exists there is a table, and on the table nothing yet.', bg: 'Преди материалът да съществува, има маса, а на масата — още нищо.', de: 'Bevor das Material existiert, gibt es einen Tisch, und auf dem Tisch noch nichts.' }
  },
  {
    id: 'a-06d135037c12fedf',
    draft: true,
    heldBack: 'a screenshot of somebody else\'s Instagram post, showing their handle and their words — their copyright and their account, not this archive\'s to republish',
    kind: 'photo',
    tags: ['workshop'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-3bae0779b80bc772',
    draft: true,
    heldBack: 'a drawing of four clown figures whose author is not recorded — an illustration cannot be published as a photograph of the work without knowing who made it',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-5214fe392c281774',
    kind: 'photo',
    tags: ['workshop', 'children', 'performance'],
    othersInFrame: 'a seated audience including several small children, clearly identifiable',
    alt: { en: 'A performer in a pink patterned costume balancing in a high kick along a low beam while a seated audience of adults and small children watches', bg: 'Артист в розов десениран костюм балансира с висок ритник по ниска греда пред седнала публика от възрастни и малки деца', de: 'Eine Darstellerin im rosa gemusterten Kostüm balanciert mit hohem Kick auf einem niedrigen Balken vor sitzendem Publikum aus Erwachsenen und kleinen Kindern' },
    caption: { en: 'A beam a hand\'s breadth off the ground is high enough if somebody is watching.', bg: 'Греда на една длан от земята е достатъчно висока, ако някой гледа.', de: 'Ein Balken eine Handbreit über dem Boden ist hoch genug, wenn jemand zusieht.' }
  },
  {
    id: 'a-597e6067aaf640d3',
    kind: 'photo',
    tags: ['street', 'props', 'performance'],
    othersInFrame: 'a fellow performer, clearly identifiable',
    alt: { en: 'Titania Chaos in red and a fellow performer framed inside a turquoise hoop against a stone wall', bg: 'Титания Хаос в червено и друг артист, рамкирани в тюркоазен обръч пред каменна стена', de: 'Titania Chaos in Rot und ein Kollege, gerahmt von einem türkisen Reifen vor einer Steinmauer' },
    caption: { en: 'A hoop makes a frame, and a frame makes two people a picture.', bg: 'Обръчът прави рамка, а рамката прави от двама души картина.', de: 'Ein Reifen wird zum Rahmen, und ein Rahmen macht aus zwei Menschen ein Bild.' }
  },
  {
    id: 'a-6929cbe7e418b679',
    kind: 'photo',
    tags: ['children', 'portrait'],
    othersInFrame: 'a child, clearly identifiable',
    alt: { en: 'Titania Chaos in a red nose and glasses close beside a child, both looking into the camera', bg: 'Титания Хаос с червен нос и очила плътно до дете, и двамата гледат в камерата', de: 'Titania Chaos mit roter Nase und Brille dicht neben einem Kind, beide blicken in die Kamera' },
    caption: { en: 'The nose is the shortest introduction there is.', bg: 'Носът е най-краткото представяне, което съществува.', de: 'Die Nase ist die kürzeste Vorstellung, die es gibt.' }
  },
  {
    id: 'a-6bd9c2d47300f293',
    kind: 'photo',
    tags: ['workshop', 'children', 'props'],
    othersInFrame: 'a child on the ball and other participants, clearly identifiable',
    alt: { en: 'A child balancing upright on a large exercise ball, steadied by two adults in a bright workshop room', bg: 'Дете балансира право върху голяма гимнастическа топка, придържано от двама възрастни в светла зала за работилница', de: 'Ein Kind balanciert aufrecht auf einem großen Gymnastikball, gestützt von zwei Erwachsenen in einem hellen Workshopraum' },
    caption: { en: 'Two pairs of hands are the whole apparatus.', bg: 'Два чифта ръце са целият уред.', de: 'Zwei Paar Hände sind der ganze Apparat.' }
  },
  {
    id: 'a-8b30b47754adaae4',
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about fourteen workshop participants, clearly identifiable',
    alt: { en: 'A group of about fourteen workshop participants in red noses posed together at the end of a session', bg: 'Група от около четиринадесет участници в работилница с червени носове, застанали заедно в края на занятието', de: 'Eine Gruppe von etwa vierzehn Workshop-Teilnehmenden mit roten Nasen am Ende einer Einheit' },
    caption: { en: 'Everyone leaves with the same nose and a different discovery.', bg: 'Всички си тръгват с еднакъв нос и различно откритие.', de: 'Alle gehen mit derselben Nase und einer anderen Entdeckung.' }
  },
  {
    id: 'a-9eedf775a25a7a47',
    kind: 'photo',
    tags: ['stage', 'children', 'performance'],
    othersInFrame: 'several children on stage, clearly identifiable',
    alt: { en: 'Titania Chaos in red on a dark stage spraying a burst of white while several children play around her', bg: 'Титания Хаос в червено на тъмна сцена пръска бял облак, докато няколко деца играят около нея', de: 'Titania Chaos in Rot auf dunkler Bühne versprüht einen weißen Schwall, während mehrere Kinder um sie herum spielen' },
    caption: { en: 'The stage stops being a stage the moment the children are on it.', bg: 'Сцената спира да бъде сцена в мига, в който децата са на нея.', de: 'Die Bühne hört auf, Bühne zu sein, sobald die Kinder darauf stehen.' }
  },
  {
    id: 'a-aed9ec2ec09f7956',
    kind: 'photo',
    tags: ['street', 'props', 'performance'],
    othersInFrame: 'passers-by, mostly legs and backs, one or two identifiable',
    alt: { en: 'Titania Chaos kneeling on a pavement in a green and red costume beside a jointed dog puppet, with passers-by walking past', bg: 'Титания Хаос коленичи на тротоара в зелен и червен костюм до кукла куче със стави, а минувачи отминават', de: 'Titania Chaos kniet im grün-roten Kostüm auf dem Gehsteig neben einer Gelenkpuppe in Hundeform, Passanten gehen vorbei' },
    caption: { en: 'A street audience is made of people who had somewhere else to be.', bg: 'Уличната публика е от хора, които са били тръгнали другаде.', de: 'Ein Straßenpublikum besteht aus Leuten, die eigentlich woanders hinwollten.' }
  },
  {
    id: 'a-bf2c4943610a52c9',
    draft: true,
    heldBack: 'the same photograph as juggling-pass, re-added by an import under its archive hash',
    kind: 'photo',
    tags: ['juggling', 'street', 'props'],
    othersInFrame: 'a child\'s hand and an adult behind, partly identifiable',
    alt: { en: 'Titania Chaos in a red dress catching a pink club on a cobbled square, with a child\'s hand reaching in from the edge', bg: 'Титания Хаос в червена рокля хваща розова бухалка на калдъръмен площад, а от края посяга детска ръка', de: 'Titania Chaos im roten Kleid fängt eine rosa Keule auf einem Kopfsteinpflasterplatz, vom Rand greift eine Kinderhand herein' },
    caption: { en: 'Juggling in the open air is an invitation nobody has to accept.', bg: 'Жонглирането на открито е покана, която никой не е длъжен да приеме.', de: 'Jonglieren im Freien ist eine Einladung, die niemand annehmen muss.' }
  },
  {
    id: 'a-dfc28077d265745f',
    draft: true,
    heldBack: 'the Mini Art Fondation Sofia logo — another organisation\'s trademark, not a photograph of the work',
    kind: 'photo',
    tags: ['press'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-e4384cfe78cdc552',
    kind: 'photo',
    tags: ['stage', 'props'],
    alt: { en: 'Titania Chaos on a dark stage in a striped jacket and red trousers behind a table draped in blue cloth', bg: 'Титания Хаос на тъмна сцена с раирано сако и червен панталон зад маса, покрита със синя материя', de: 'Titania Chaos auf dunkler Bühne in gestreiftem Jackett und roter Hose hinter einem blau bespannten Tisch' },
    caption: { en: 'Light on a table and dark everywhere else is already a scene.', bg: 'Светлина върху маса и тъмнина навсякъде другаде вече е сцена.', de: 'Licht auf einem Tisch und Dunkel ringsum ist bereits eine Szene.' }
  },
  {
    id: 'a-71d43133-c678-4ee5-af41-53856f37ffa3',
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: { en: 'Titania Chaos outdoors in a turquoise dress and navy jacket, arms flung open, sunglasses on, against a bright sky', bg: 'Титания Хаос навън с тюркоазена рокля и тъмносиньо сако, широко разперени ръце, слънчеви очила, на фона на светло небе', de: 'Titania Chaos im Freien in türkisem Kleid und marineblauem Jackett, die Arme weit geöffnet, Sonnenbrille, vor hellem Himmel' },
    caption: { en: 'An entrance works outdoors too; there is simply no wing to come out of.', bg: 'Излизането работи и навън; просто няма кулиса, от която да излезеш.', de: 'Ein Auftritt funktioniert auch draußen; es fehlt nur die Gasse, aus der man kommt.' }
  },
  {
    id: 'a-c6ab823a-6d6e-48cd-8dba-d3c2f158e590',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'Titania Chaos in a high-collared turquoise dress and red nose, looking away from the camera against a pale wall', bg: 'Титания Хаос с тюркоазена рокля с висока яка и червен нос, гледа встрани от камерата на фона на светла стена', de: 'Titania Chaos in türkisem Kleid mit hohem Kragen und roter Nase, den Blick von der Kamera abgewandt, vor heller Wand' },
    caption: { en: 'The nose is on and the person underneath has not decided anything yet.', bg: 'Носът е сложен, а човекът отдолу още нищо не е решил.', de: 'Die Nase sitzt, und der Mensch darunter hat noch nichts entschieden.' }
  },
  {
    id: 'a-img-0013',
    kind: 'photo',
    tags: ['portrait', 'street'],
    alt: { en: 'Selfie of Titania Chaos in a yellow-green knitted hat and a red coat with a red nose, on a snowy square', bg: 'Селфи на Титания Хаос с жълто-зелена плетена шапка и червено палто с червен нос, на заснежен площад', de: 'Selfie von Titania Chaos mit gelbgrüner Strickmütze und rotem Mantel mit roter Nase auf einem verschneiten Platz' },
    caption: { en: 'Winter clothes and a red nose make a costume out of an ordinary afternoon.', bg: 'Зимни дрехи и червен нос правят костюм от един обикновен следобед.', de: 'Winterkleidung und eine rote Nase machen aus einem gewöhnlichen Nachmittag ein Kostüm.' }
  },
  {
    id: 'a-img-0468',
    draft: true,
    heldBack: 'the same photograph as a-c6ab823a-6d6e-48cd-8dba-d3c2f158e590, which was here first and is already published — not a question of approval, only of showing one picture once',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'Titania Chaos in a turquoise high-collared dress with a red nose, standing quietly against a pale wall', bg: 'Титания Хаос с тюркоазена рокля с висока яка и червен нос, застанала тихо до светла стена', de: 'Titania Chaos in türkisem Kleid mit hohem Kragen und roter Nase, still vor einer hellen Wand' },
    caption: { en: 'Waiting is most of the work and almost never the photograph.', bg: 'Чакането е по-голямата част от работата и почти никога — снимката.', de: 'Warten ist der größte Teil der Arbeit und fast nie das Foto.' }
  },
  {
    id: 'a-img-0491',
    kind: 'photo',
    tags: ['portrait', 'stage'],
    alt: { en: 'Titania Chaos standing in a long dark dress with a white collar and cuffs, red nose on, hands open beside a dark curtain', bg: 'Титания Хаос стои с дълга тъмна рокля с бяла яка и маншети, с червен нос и отворени длани до тъмна завеса', de: 'Titania Chaos steht in einem langen dunklen Kleid mit weißem Kragen und weißen Manschetten, rote Nase, die Hände offen neben einem dunklen Vorhang' },
    caption: { en: 'The hands are already saying something the face has not agreed to.', bg: 'Ръцете вече казват нещо, с което лицето не се е съгласило.', de: 'Die Hände sagen schon etwas, dem das Gesicht nicht zugestimmt hat.' }
  },
  {
    id: 'a-img-0494',
    kind: 'photo',
    tags: ['props', 'stage'],
    alt: { en: 'Titania Chaos behind a hanging curtain of green and pink fringes on a black stage', bg: 'Титания Хаос зад висяща завеса от зелени и розови ресни на черна сцена', de: 'Titania Chaos hinter einem hängenden Vorhang aus grünen und rosa Fransen auf schwarzer Bühne' },
    caption: { en: 'Anything you can look through is a place to appear from.', bg: 'Всичко, през което може да се гледа, е място, откъдето да се появиш.', de: 'Alles, wodurch man schauen kann, ist ein Ort zum Auftauchen.' }
  },
  {
    id: 'a-img-0511',
    kind: 'photo',
    tags: ['portrait'],
    othersInFrame: 'a person behind, out of focus and not identifiable',
    alt: { en: 'Titania Chaos smiling in a turquoise dress and red nose, a blurred figure behind her', bg: 'Титания Хаос се усмихва с тюркоазена рокля и червен нос, зад нея — размита фигура', de: 'Titania Chaos lächelt in türkisem Kleid mit roter Nase, dahinter eine unscharfe Gestalt' },
    caption: { en: 'The moment before going on, which never looks like the moment after.', bg: 'Мигът преди излизането, който никога не прилича на мига след него.', de: 'Der Moment vor dem Auftritt, der nie aussieht wie der danach.' }
  },
  {
    id: 'a-img-0536',
    kind: 'photo',
    tags: ['props', 'children', 'street'],
    othersInFrame: 'a child from behind, and two adults whose faces the photographer covered with stickers in the original',
    alt: { en: 'A performer in a top hat beside a laden prop cart in a shop while a child watches from behind', bg: 'Артист с цилиндър до отрупана количка с реквизит в магазин, а отзад гледа дете', de: 'Eine Darstellerin mit Zylinder neben einem beladenen Requisitenwagen in einem Laden, ein Kind schaut von hinten zu' },
    caption: { en: 'A cart of objects gathers an audience faster than an announcement.', bg: 'Количка с предмети събира публика по-бързо от всяко обявление.', de: 'Ein Wagen voller Gegenstände versammelt schneller Publikum als jede Ankündigung.' }
  },
  {
    id: 'a-img-0561',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'Titania Chaos in a turquoise dress and red nose in a kitchen, caught mid-turn', bg: 'Титания Хаос с тюркоазена рокля и червен нос в кухня, уловена в обръщане', de: 'Titania Chaos in türkisem Kleid mit roter Nase in einer Küche, mitten in der Drehung' },
    caption: { en: 'A costume in a kitchen is the whole comedy of having a body and a life.', bg: 'Костюм в кухня е цялата комедия на това да имаш тяло и живот.', de: 'Ein Kostüm in einer Küche ist die ganze Komik davon, einen Körper und ein Leben zu haben.' }
  },
  {
    id: 'a-img-0825',
    kind: 'photo',
    tags: ['street', 'portrait', 'props'],
    alt: { en: 'Selfie of Titania Chaos in a navy jacket with gold braid in front of a bronze monument whose figures have been given red noses too', bg: 'Селфи на Титания Хаос с тъмносиньо сако със златни ширити пред бронзов паметник, чиито фигури също са с червени носове', de: 'Selfie von Titania Chaos in marineblauer Jacke mit Goldlitze vor einem Bronzedenkmal, dessen Figuren ebenfalls rote Nasen tragen' },
    caption: { en: 'The monument had never been asked before and did not object.', bg: 'Паметникът никога не е бил питан преди и не възрази.', de: 'Das Denkmal war noch nie gefragt worden und hatte nichts dagegen.' }
  },
  {
    id: 'a-img-1208',
    kind: 'photo',
    tags: ['portrait', 'props'],
    alt: { en: 'Titania Chaos shrugging with open hands, in a black bowler hat, yellow sleeves and a quilted gilet', bg: 'Титания Хаос свива рамене с отворени длани, с черно бомбе, жълти ръкави и подплатен елек', de: 'Titania Chaos zuckt mit offenen Händen die Schultern, schwarze Melone, gelbe Ärmel, Steppweste' },
    caption: { en: 'The shrug is the oldest line in the trade and needs no translation.', bg: 'Свиването на рамене е най-старата реплика в занаята и не се нуждае от превод.', de: 'Das Schulterzucken ist der älteste Satz des Fachs und braucht keine Übersetzung.' }
  },
  {
    id: 'a-img-1272',
    kind: 'photo',
    tags: ['workshop', 'street'],
    othersInFrame: 'about eight adults, clearly identifiable; one face was covered in the original',
    alt: { en: 'A circle of adults outdoors passing a gesture between them during an open-air session', bg: 'Кръг от възрастни на открито си подават жест по време на занятие навън', de: 'Ein Kreis von Erwachsenen im Freien gibt während einer Übung eine Geste weiter' },
    caption: { en: 'The circle is not a warm-up device; it is the only shape where everyone is seen.', bg: 'Кръгът не е загрявка; той е единствената форма, в която всички са видени.', de: 'Der Kreis ist keine Aufwärmübung; er ist die einzige Form, in der alle gesehen werden.' }
  },
  {
    id: 'a-img-1275',
    draft: true,
    heldBack: 'the same photograph as juggling-pass again, a third copy under a third name',
    kind: 'photo',
    tags: ['juggling', 'street'],
    othersInFrame: 'an adult and a child at the edge of the frame',
    alt: { en: 'Titania Chaos in a red dress mid-juggle with a pink club on a cobbled square', bg: 'Титания Хаос в червена рокля жонглира с розова бухалка на калдъръмен площад', de: 'Titania Chaos im roten Kleid jongliert mit einer rosa Keule auf einem Kopfsteinpflasterplatz' },
    caption: { en: 'Three objects and a square: the smallest complete apparatus there is.', bg: 'Три предмета и площад: най-малкият пълен уред, който съществува.', de: 'Drei Gegenstände und ein Platz: der kleinste vollständige Apparat, den es gibt.' }
  },
  {
    id: 'a-img-1320',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'Titania Chaos standing in a long black dress with a red antenna headpiece and red nose on a bare wooden floor', bg: 'Титания Хаос стои с дълга черна рокля, червена антена на главата и червен нос на гол дървен под', de: 'Titania Chaos steht in einem langen schwarzen Kleid mit roter Antenne im Haar und roter Nase auf blankem Holzboden' },
    caption: { en: 'An empty room is the most demanding partner in the building.', bg: 'Празната стая е най-взискателният партньор в сградата.', de: 'Ein leerer Raum ist der anspruchsvollste Partner im Haus.' }
  },
  {
    id: 'a-img-1353',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'Titania Chaos in a red beanie, glasses and red nose in a doorway of yellow glass', bg: 'Титания Хаос с червена шапка, очила и червен нос на врата от жълто стъкло', de: 'Titania Chaos mit roter Mütze, Brille und roter Nase in einem Türrahmen aus gelbem Glas' },
    caption: { en: 'The face does nothing; the nose does the announcing.', bg: 'Лицето не прави нищо; носът обявява.', de: 'Das Gesicht tut nichts; die Nase kündigt an.' }
  },
  {
    id: 'a-img-1355',
    draft: true,
    heldBack: 'the same photograph as a-06077ced0b10175c, imported twice from two folders',
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a fellow performer, clearly identifiable, and passers-by',
    alt: { en: 'Titania Chaos in red at a stone parapet watching a fellow performer hold a handstand on the pavement', bg: 'Титания Хаос в червено до каменен парапет гледа как друг артист прави стойка на ръце на тротоара', de: 'Titania Chaos in Rot an einer Steinbrüstung sieht zu, wie ein Kollege auf dem Gehsteig einen Handstand hält' },
    caption: { en: 'Somebody has to be the one who watches, or nothing is being shown.', bg: 'Някой трябва да е този, който гледа, иначе нищо не се показва.', de: 'Jemand muss der sein, der zusieht, sonst wird nichts gezeigt.' }
  },
  {
    id: 'a-img-1366',
    kind: 'photo',
    tags: ['portrait', 'props'],
    alt: { en: 'Close selfie of Titania Chaos in a long grey curled wig with round glasses and a red nose', bg: 'Близко селфи на Титания Хаос с дълга сива къдрава перука, кръгли очила и червен нос', de: 'Nahes Selfie von Titania Chaos in langer grauer Lockenperücke mit runder Brille und roter Nase' },
    caption: { en: 'Borrowed authority, worn at arm\'s length from a phone.', bg: 'Заета авторитетност, носена на една ръка разстояние от телефона.', de: 'Geliehene Autorität, auf Armlänge vom Telefon getragen.' }
  },
  {
    id: 'a-img-1406',
    kind: 'photo',
    tags: ['street', 'juggling', 'performance'],
    othersInFrame: 'a fellow performer, clearly identifiable',
    alt: { en: 'Titania Chaos in a red dress beside a fellow performer holding green clubs in front of a stone staircase', bg: 'Титания Хаос в червена рокля до друг артист със зелени бухалки пред каменно стълбище', de: 'Titania Chaos im roten Kleid neben einem Kollegen mit grünen Keulen vor einer Steintreppe' },
    caption: { en: 'Two people and a staircase: the set was already there.', bg: 'Двама души и стълбище: декорът вече е бил там.', de: 'Zwei Menschen und eine Treppe: das Bühnenbild war schon da.' }
  },
  {
    id: 'a-img-1414',
    kind: 'photo',
    tags: ['street', 'props'],
    alt: { en: 'Titania Chaos in a turquoise skirt and dark jacket holding a red hoop in front of a baroque church and monument in Vienna', bg: 'Титания Хаос с тюркоазена пола и тъмно сако държи червен обръч пред барокова църква и паметник във Виена', de: 'Titania Chaos in türkisem Rock und dunklem Jackett hält einen roten Reifen vor einer barocken Kirche und einem Denkmal in Wien' },
    caption: { en: 'The city lends its best backdrop to anyone willing to stand in front of it.', bg: 'Градът заема най-добрия си декор на всеки, готов да застане пред него.', de: 'Die Stadt leiht ihre beste Kulisse jedem, der sich davorstellt.' }
  },
  {
    id: 'a-img-1419',
    kind: 'photo',
    tags: ['children', 'street', 'props'],
    othersInFrame: 'several children, clearly identifiable',
    alt: { en: 'Titania Chaos in red crouched with juggling props among children on a cobbled street', bg: 'Титания Хаос в червено, приклекнала с реквизит за жонглиране сред деца на калдъръмена улица', de: 'Titania Chaos in Rot hockt mit Jongliergerät zwischen Kindern auf einer Kopfsteinpflasterstraße' },
    caption: { en: 'Handing the object over is where the performance stops being one.', bg: 'Подаването на предмета е мястото, където представлението спира да бъде представление.', de: 'Das Weitergeben des Gegenstands ist der Moment, in dem die Vorstellung aufhört, eine zu sein.' }
  },
  {
    id: 'a-img-1474',
    kind: 'photo',
    tags: ['street', 'portrait'],
    othersInFrame: 'two men, clearly identifiable',
    alt: { en: 'Titania Chaos with an orange nose standing between two seated men on a grassy bank', bg: 'Титания Хаос с оранжев нос, застанала между двама седнали мъже на тревист бряг', de: 'Titania Chaos mit oranger Nase zwischen zwei sitzenden Männern auf einer Wiese' },
    caption: { en: 'An audience of two is still an audience and knows it.', bg: 'Публика от двама пак е публика и го знае.', de: 'Ein Publikum von zwei ist immer noch ein Publikum und weiß das.' }
  },
  {
    id: 'a-img-1610',
    kind: 'photo',
    tags: ['workshop', 'children', 'performance'],
    othersInFrame: 'two children on the platform and a seated audience, clearly identifiable',
    alt: { en: 'A performer in a pink patterned costume on a low platform holding hands with two children while others watch', bg: 'Артист в розов десениран костюм на нисък подиум държи ръцете на две деца, а други гледат', de: 'Eine Darstellerin im rosa gemusterten Kostüm auf einem niedrigen Podest hält zwei Kinder an den Händen, andere schauen zu' },
    caption: { en: 'A platform two hands high is a tightrope if you agree that it is.', bg: 'Подиум висок две длани е въже, ако се съгласиш, че е.', de: 'Ein Podest zwei Handbreit hoch ist ein Seil, wenn man sich darauf einigt.' }
  },
  {
    id: 'a-img-2173',
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'Studio portrait of Titania Chaos in a dark dress with a wide white collar and a red nose, hands held together', bg: 'Студиен портрет на Титания Хаос с тъмна рокля с широка бяла яка и червен нос, събрани ръце', de: 'Studioporträt von Titania Chaos in dunklem Kleid mit breitem weißem Kragen und roter Nase, die Hände zusammengelegt' },
    caption: { en: 'The collar does the formality so the face does not have to.', bg: 'Яката поема официалността, за да не се налага лицето да я поема.', de: 'Der Kragen übernimmt die Förmlichkeit, damit das Gesicht es nicht muss.' }
  },
  {
    id: 'a-img-2193',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'Titania Chaos against a magenta curtain in a pale bun and white collar, red nose on, pointing at herself', bg: 'Титания Хаос пред пурпурна завеса със светъл кок и бяла яка, с червен нос, сочи себе си', de: 'Titania Chaos vor einem magentafarbenen Vorhang mit hellem Dutt und weißem Kragen, rote Nase, zeigt auf sich selbst' },
    caption: { en: 'Pointing at yourself is the shortest confession in the trade.', bg: 'Да посочиш себе си е най-краткото признание в занаята.', de: 'Auf sich selbst zu zeigen ist das kürzeste Geständnis des Fachs.' }
  },
  {
    id: 'a-img-2634',
    kind: 'photo',
    tags: ['children', 'birthday', 'balloons'],
    othersInFrame: 'several children, clearly identifiable',
    alt: { en: 'Titania Chaos leaning down among several children at a decorated party table', bg: 'Титания Хаос се навежда сред няколко деца на украсена празнична маса', de: 'Titania Chaos beugt sich zwischen mehreren Kindern an einem geschmückten Festtisch hinunter' },
    caption: { en: 'At a child\'s height the room is a different room.', bg: 'На височината на дете стаята е друга стая.', de: 'Auf Kinderhöhe ist der Raum ein anderer Raum.' }
  },
  {
    id: 'a-img-2709',
    kind: 'photo',
    tags: ['street', 'performance', 'props'],
    alt: { en: 'Titania Chaos in a red suit standing on a painted oil drum in the middle of a city street', bg: 'Титания Хаос в червен костюм, застанала върху боядисан варел насред градска улица', de: 'Titania Chaos im roten Anzug steht auf einem bemalten Ölfass mitten auf einer Stadtstraße' },
    caption: { en: 'Height is the cheapest way to be a performance rather than a person.', bg: 'Височината е най-евтиният начин да си представление, а не човек.', de: 'Höhe ist der billigste Weg, eine Vorstellung zu sein statt eine Person.' }
  },
  {
    id: 'a-img-2712',
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a passer-by, clearly identifiable',
    alt: { en: 'Titania Chaos in red stepping down from a painted drum while a passer-by in black stops to look', bg: 'Титания Хаос в червено слиза от боядисан варел, а минувач в черно спира да погледне', de: 'Titania Chaos in Rot steigt von einem bemalten Fass, ein Passant in Schwarz bleibt stehen' },
    caption: { en: 'One person stopping is the difference between a street and a theatre.', bg: 'Един спрял човек е разликата между улица и театър.', de: 'Ein Mensch, der stehen bleibt, ist der Unterschied zwischen Straße und Theater.' }
  },
  {
    id: 'a-img-2845',
    kind: 'photo',
    tags: ['portrait', 'solitude', 'props'],
    alt: { en: 'Titania Chaos in a red polka-dot jumpsuit sitting barefoot inside a blue arched niche', bg: 'Титания Хаос с червен гащеризон на точки, седнала боса в синя сводеста ниша', de: 'Titania Chaos im rot gepunkteten Overall sitzt barfuß in einer blauen Bogennische' },
    caption: { en: 'A niche the size of a person is a room with an opinion about you.', bg: 'Ниша с размера на човек е стая, която има мнение за теб.', de: 'Eine Nische in Menschengröße ist ein Raum mit einer Meinung über dich.' }
  },
  {
    id: 'a-img-2906',
    kind: 'photo',
    tags: ['portrait', 'workshop'],
    alt: { en: 'Titania Chaos in bright floral dungarees and a red nose in a daylit studio', bg: 'Титания Хаос с ярък цветен гащеризон и червен нос в осветено от деня студио', de: 'Titania Chaos in bunter Blumenlatzhose mit roter Nase in einem tageshellen Studio' },
    caption: { en: 'Working clothes, which in this trade are also the costume.', bg: 'Работни дрехи, които в този занаят са и костюмът.', de: 'Arbeitskleidung, die in diesem Beruf zugleich das Kostüm ist.' }
  },
  {
    id: 'a-img-3341',
    kind: 'photo',
    tags: ['portrait', 'stage'],
    alt: { en: 'Titania Chaos full length in a red polka-dot jumpsuit and pale shoes against a black ground', bg: 'Титания Хаос в цял ръст с червен гащеризон на точки и светли обувки на черен фон', de: 'Titania Chaos in ganzer Figur im rot gepunkteten Overall und hellen Schuhen vor schwarzem Grund' },
    caption: { en: 'Black behind a body is a promise that something is about to happen.', bg: 'Черното зад едно тяло е обещание, че нещо ще се случи.', de: 'Schwarz hinter einem Körper ist ein Versprechen, dass gleich etwas passiert.' }
  },
  {
    id: 'a-img-3608',
    kind: 'video',
    seconds: 14,
    tags: ['juggling'],
    alt: { en: 'Titania Chaos in floral dungarees walking the length of a trampoline lane in a sports hall', bg: 'Титания Хаос с цветен гащеризон върви по батутна писта в спортна зала', de: 'Titania Chaos in Blumenlatzhose geht die Länge einer Trampolinbahn in einer Sporthalle entlang' },
    caption: { en: 'A floor that answers back changes what walking is.', bg: 'Под, който отвръща, променя това какво е ходенето.', de: 'Ein Boden, der antwortet, verändert, was Gehen ist.' }
  },
  {
    id: 'a-img-3630',
    kind: 'video',
    seconds: 8,
    tags: ['children', 'workshop'],
    othersInFrame: 'several children watching, clearly identifiable',
    alt: { en: 'Titania Chaos in red diving forward onto a mat in a gym while children watch from the wall bars', bg: 'Титания Хаос в червено се гмурка напред върху дюшек в салон, а деца гледат от шведската стена', de: 'Titania Chaos in Rot taucht in einer Turnhalle nach vorn auf eine Matte, Kinder schauen von der Sprossenwand zu' },
    caption: { en: 'Falling on purpose is the first thing worth teaching.', bg: 'Да паднеш нарочно е първото нещо, което си струва да се научи.', de: 'Absichtlich zu fallen ist das Erste, was zu lehren sich lohnt.' }
  },
  {
    id: 'a-img-3811',
    kind: 'photo',
    tags: ['workshop', 'stage'],
    othersInFrame: 'about fourteen participants, clearly identifiable',
    alt: { en: 'A group of about fourteen participants posed on a stage at the end of a course', bg: 'Група от около четиринадесет участници, застанали на сцена в края на курс', de: 'Eine Gruppe von etwa vierzehn Teilnehmenden auf einer Bühne am Ende eines Kurses' },
    caption: { en: 'The last photograph of a course is always the loudest thing in it.', bg: 'Последната снимка от един курс винаги е най-шумното нещо в него.', de: 'Das letzte Foto eines Kurses ist immer das Lauteste daran.' }
  },
  {
    id: 'a-img-3834',
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about fourteen participants, clearly identifiable',
    alt: { en: 'About fourteen workshop participants with arms raised in a bright white studio', bg: 'Около четиринадесет участници в работилница с вдигнати ръце в светло бяло студио', de: 'Etwa vierzehn Workshop-Teilnehmende mit erhobenen Armen in einem hellen weißen Studio' },
    caption: { en: 'An empty white room and fourteen people willing to look foolish.', bg: 'Празна бяла стая и четиринадесет души, готови да изглеждат глупаво.', de: 'Ein leerer weißer Raum und vierzehn Menschen, die bereit sind, sich zum Narren zu machen.' }
  },
  {
    id: 'a-img-4187',
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a second person, clearly identifiable, walking beside her',
    alt: { en: 'Titania Chaos in a red nose, sunglasses and a green-and-red sash beside another woman at a football pitch, a Bulgarian flag hung on the fence behind them', bg: 'Титания Хаос с червен нос, слънчеви очила и зелено-червен шарф до друга жена на футболно игрище, с българско знаме, окачено на оградата зад тях', de: 'Titania Chaos mit roter Nase, Sonnenbrille und grün-roter Schärpe neben einer anderen Frau auf einem Fußballplatz, dahinter eine bulgarische Fahne am Zaun' },
    caption: { en: 'A Bulgarian flag on a Viennese fence, and a clown who came for the football.', bg: 'Българско знаме на виенска ограда и клоун, дошъл заради футбола.', de: 'Eine bulgarische Fahne an einem Wiener Zaun und ein Clown, der wegen des Fußballs gekommen ist.' }
  },
  {
    id: 'a-img-4367',
    draft: true,
    heldBack: 'the same shadow as the frame named shadow, which was here first; a slightly different crop of one moment',
    kind: 'photo',
    tags: ['solitude'],
    alt: { en: 'The shadow of a standing figure with an antenna headpiece and both arms open, cast across a pale wall', bg: 'Сянката на права фигура с антена на главата и разперени ръце, паднала върху светла стена', de: 'Der Schatten einer stehenden Gestalt mit Antenne im Haar und offenen Armen auf einer hellen Wand' },
    caption: { en: 'The shadow does the gesture a moment late and better.', bg: 'Сянката прави жеста миг по-късно и по-добре.', de: 'Der Schatten macht die Geste einen Moment später und besser.' }
  },
  {
    id: 'a-img-4503',
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about eleven participants, clearly identifiable',
    alt: { en: 'About eleven workshop participants in red noses crowded together for a photograph in a plain room', bg: 'Около единадесет участници в работилница с червени носове, скупчени за снимка в обикновена стая', de: 'Etwa elf Workshop-Teilnehmende mit roten Nasen drängen sich in einem schlichten Raum für ein Foto zusammen' },
    caption: { en: 'Eleven people who have stopped minding how they look.', bg: 'Единадесет души, които са спрели да мислят как изглеждат.', de: 'Elf Menschen, denen egal geworden ist, wie sie aussehen.' }
  },
  {
    id: 'a-img-4690',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'Titania Chaos in a turquoise dress and red nose gesturing in a bright corridor', bg: 'Титания Хаос с тюркоазена рокля и червен нос жестикулира в светъл коридор', de: 'Titania Chaos in türkisem Kleid mit roter Nase gestikuliert in einem hellen Gang' },
    caption: { en: 'A corridor is a stage with the audience at both ends.', bg: 'Коридорът е сцена с публика в двата края.', de: 'Ein Gang ist eine Bühne mit Publikum an beiden Enden.' }
  },
  {
    id: 'a-img-5951',
    draft: true,
    heldBack: 'the same photograph as camera-portrait, which was here first and is named for what it is; this is the import under its filename',
    kind: 'photo',
    tags: ['camera', 'props', 'portrait'],
    alt: { en: 'Titania Chaos in a pink headpiece beside the time-travelling camera, a large wooden plate camera on a tripod', bg: 'Титания Хаос с розова украса за глава до пътуващата във времето камера — голям дървен фотоапарат на статив', de: 'Titania Chaos mit rosa Kopfschmuck neben der Zeitreisekamera, einer großen hölzernen Plattenkamera auf einem Stativ' },
    caption: { en: 'The camera does not take the picture; it gives people a reason to pose.', bg: 'Камерата не прави снимката; тя дава на хората повод да позират.', de: 'Die Kamera macht das Bild nicht; sie gibt den Leuten einen Grund zu posieren.' }
  },
  {
    id: 'a-img-6026',
    kind: 'photo',
    tags: ['performance', 'stage', 'props'],
    othersInFrame: 'several performers, clearly identifiable, one using a wheelchair',
    alt: { en: 'Performers in bright clown costume on a wooden stage beside a wheelchair strung with coloured lights', bg: 'Артисти в ярки клоунски костюми на дървена сцена до инвалидна количка, окичена с цветни лампички', de: 'Darstellende in bunten Clownskostümen auf einer Holzbühne neben einem mit bunten Lichtern geschmückten Rollstuhl' },
    caption: { en: 'A wheelchair hung with lights is a vehicle, and the show is built around it.', bg: 'Количка, окичена със светлини, е превозно средство, и представлението се гради около нея.', de: 'Ein mit Lichtern behängter Rollstuhl ist ein Fahrzeug, und die Vorstellung baut sich darum.' }
  },
  {
    id: 'a-img-6371',
    kind: 'photo',
    tags: ['street', 'performance'],
    alt: { en: 'Titania Chaos in a red dress standing on a turquoise barrel on rough ground by a river wall', bg: 'Титания Хаос в червена рокля стои върху тюркоазен варел на неравна земя до речна стена', de: 'Titania Chaos im roten Kleid steht auf einem türkisen Fass auf unebenem Boden an einer Ufermauer' },
    caption: { en: 'Anywhere with a drop and a barrel will do.', bg: 'Става всяко място със спад и варел.', de: 'Es genügt jeder Ort mit Gefälle und einem Fass.' }
  },
  {
    id: 'a-img-6421',
    kind: 'photo',
    tags: ['juggling', 'street', 'children'],
    othersInFrame: 'a woman and two small children, clearly identifiable',
    alt: { en: 'Titania Chaos juggling on a park path while a woman with a pram and two small children stop to watch', bg: 'Титания Хаос жонглира по алея в парка, а жена с количка и две малки деца спират да гледат', de: 'Titania Chaos jongliert auf einem Parkweg, eine Frau mit Kinderwagen und zwei kleine Kinder bleiben stehen' },
    caption: { en: 'The pram stopping is the review.', bg: 'Спрялата количка е рецензията.', de: 'Der stehen gebliebene Kinderwagen ist die Kritik.' }
  },
  {
    id: 'a-img-6763',
    kind: 'photo',
    tags: ['press', 'props', 'portrait'],
    alt: { en: 'Titania Chaos holding up a black T-shirt printed with the Bulgarian words for hungry circus, in a market stall', bg: 'Титания Хаос вдига черна тениска с надпис „Аз съм гладен цирк“ на щанд на пазар', de: 'Titania Chaos hält ein schwarzes T-Shirt mit bulgarischer Aufschrift „Ich bin hungriger Zirkus“ an einem Marktstand hoch' },
    caption: { en: 'The circus says out loud what the profession usually keeps quiet.', bg: 'Циркът казва на глас това, което професията обикновено премълчава.', de: 'Der Zirkus sagt laut, was der Beruf sonst verschweigt.' }
  },
  {
    id: 'a-img-7052',
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: { en: 'Titania Chaos in a teal hooded jacket and dark cap, leaning against an ivy-covered wall beneath a hand-painted banner reading “Safe abortion is a human right”', bg: 'Титания Хаос с тюркоазено яке с качулка и тъмна шапка, облегната на обрасла с бръшлян стена под ръчно изписан транспарант „Безопасният аборт е човешко право“', de: 'Titania Chaos in türkisfarbener Kapuzenjacke und dunkler Mütze, an eine efeubewachsene Wand gelehnt, unter einem handgemalten Transparent mit der Aufschrift „Sicherer Schwangerschaftsabbruch ist ein Menschenrecht“' },
    caption: { en: 'No costume, no nose. Some things she stands under as herself.', bg: 'Без костюм, без нос. Под някои неща застава като себе си.', de: 'Kein Kostüm, keine Nase. Unter manchem steht sie als sie selbst.' }
  },
  {
    id: 'a-img-7217',
    kind: 'video',
    seconds: 20,
    tags: ['street', 'solitude'],
    othersInFrame: 'two distant figures, too small to identify',
    alt: { en: 'A distant figure walking along the foot of a long grey building on an empty street', bg: 'Далечна фигура върви покрай основата на дълга сива сграда на празна улица', de: 'Eine ferne Gestalt geht am Fuß eines langen grauen Gebäudes eine leere Straße entlang' },
    caption: { en: 'From far enough away every walk is a solo.', bg: 'От достатъчно далеч всяко вървене е соло.', de: 'Aus genügend Entfernung ist jedes Gehen ein Solo.' }
  },
  {
    id: 'a-img-7288',
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'a fellow performer, clearly identifiable',
    alt: { en: 'Titania Chaos in red on a dark stage beside a performer in a white polka-dot shirt holding a cup', bg: 'Титания Хаос в червено на тъмна сцена до артист с бяла риза на точки, който държи чаша', de: 'Titania Chaos in Rot auf dunkler Bühne neben einem Darsteller im weiß gepunkteten Hemd mit einer Tasse' },
    caption: { en: 'Two clowns and one cup is a plot.', bg: 'Двама клоуни и една чаша са сюжет.', de: 'Zwei Clowns und eine Tasse sind eine Handlung.' }
  },
  {
    id: 'a-img-7300',
    kind: 'photo',
    tags: ['solitude', 'street', 'portrait'],
    alt: { en: 'Titania Chaos in an orange dress standing in the fork of a bare tree at night, arms spread', bg: 'Титания Хаос с оранжева рокля стои в разклонението на голо дърво през нощта, с разперени ръце', de: 'Titania Chaos im orangen Kleid steht nachts in der Astgabel eines kahlen Baums, die Arme ausgebreitet' },
    caption: { en: 'Nobody is watching, which is when the best of it happens.', bg: 'Никой не гледа — тъкмо тогава се случва най-доброто.', de: 'Niemand schaut zu, und genau dann passiert das Beste.' }
  },
  {
    id: 'a-img-8040',
    kind: 'photo',
    tags: ['solitude', 'street'],
    alt: { en: 'Titania Chaos in a red dress climbing the trunk of a tree in a green park', bg: 'Титания Хаос в червена рокля се катери по ствол на дърво в зелен парк', de: 'Titania Chaos im roten Kleid klettert an einem Baumstamm in einem grünen Park' },
    caption: { en: 'A tree is the only rehearsal room that is never booked.', bg: 'Дървото е единствената репетиционна, която никога не е заета.', de: 'Ein Baum ist der einzige Probenraum, der nie belegt ist.' }
  },
  {
    id: 'a-img-8092',
    kind: 'video',
    seconds: 12,
    tags: ['props', 'solitude'],
    alt: { en: 'A figure silhouetted against a pale sky raising two coloured flags overhead', bg: 'Фигура на фона на бледо небе вдига два цветни флага над главата си', de: 'Eine Gestalt vor blassem Himmel hebt zwei bunte Fahnen über den Kopf' },
    caption: { en: 'Signalling to nobody in particular, which is most of practice.', bg: 'Сигнал към никого конкретно — това е по-голямата част от практиката.', de: 'Signale an niemand Bestimmten, was der größte Teil des Übens ist.' }
  },
  {
    id: 'a-img-8211',
    kind: 'photo',
    tags: ['children', 'workshop', 'props'],
    othersInFrame: 'a class of young children, clearly identifiable',
    alt: { en: 'A performer in a top hat surrounded by young children in a classroom hung with their drawings and a paper rainbow', bg: 'Артист с цилиндър, заобиколен от малки деца в класна стая с техните рисунки и хартиена дъга', de: 'Eine Darstellerin mit Zylinder, umringt von kleinen Kindern in einem Klassenzimmer mit ihren Zeichnungen und einem Papierregenbogen' },
    caption: { en: 'Surrounded is the only way to be in a room this size.', bg: 'Заобиколен е единственият начин да си в стая с такъв размер.', de: 'Umringt ist die einzige Art, in einem Raum dieser Größe zu sein.' }
  },
  {
    id: 'a-img-8521',
    kind: 'photo',
    tags: ['solitude', 'props'],
    alt: { en: 'Titania Chaos in a plain black hoodie and jeans standing over a heap of costumes on a wooden floor', bg: 'Титания Хаос с обикновен черен суитшърт и дънки, застанала над купчина костюми на дървен под', de: 'Titania Chaos in schlichtem schwarzem Hoodie und Jeans über einem Haufen Kostüme auf Holzboden' },
    caption: { en: 'Before the costume there is a person deciding whether to put it on.', bg: 'Преди костюма има човек, който решава дали да го облече.', de: 'Vor dem Kostüm steht ein Mensch, der entscheidet, ob er es anzieht.' }
  },
  {
    id: 'a-img-8528',
    kind: 'photo',
    tags: ['props', 'solitude'],
    alt: { en: 'Titania Chaos in a black hoodie and a white tulle skirt beside an open costume bag', bg: 'Титания Хаос с черен суитшърт и бяла тюлена пола до отворен сак с костюми', de: 'Titania Chaos in schwarzem Hoodie und weißem Tüllrock neben einer offenen Kostümtasche' },
    caption: { en: 'Half a costume is funnier than a whole one and harder to wear.', bg: 'Половин костюм е по-смешен от цял и по-труден за носене.', de: 'Ein halbes Kostüm ist komischer als ein ganzes und schwerer zu tragen.' }
  },
  {
    id: 'a-img-8569',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'Titania Chaos standing straight in a red boilersuit with a red nose against a plain wall', bg: 'Титания Хаос стои изправена с червен работен гащеризон и червен нос до гола стена', de: 'Titania Chaos steht aufrecht im roten Overall mit roter Nase vor einer kahlen Wand' },
    caption: { en: 'One colour, one wall, and whatever the body decides to add.', bg: 'Един цвят, една стена и каквото тялото реши да добави.', de: 'Eine Farbe, eine Wand und was der Körper hinzufügt.' }
  },
  {
    id: 'a-img-8628',
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about thirteen participants, clearly identifiable',
    alt: { en: 'About thirteen workshop participants in a studio, some standing, some crouched, all in mid-gesture', bg: 'Около тринадесет участници в работилница в студио — някои прави, други приклекнали, всички в жест', de: 'Etwa dreizehn Workshop-Teilnehmende in einem Studio, teils stehend, teils hockend, alle mitten in einer Geste' },
    caption: { en: 'The group photograph everyone insists on, and it is always the truest one.', bg: 'Груповата снимка, на която всички настояват, и винаги най-истинската.', de: 'Das Gruppenfoto, auf dem alle bestehen, und immer das ehrlichste.' }
  },
  {
    id: 'a-img-8734',
    draft: true,
    heldBack: 'the same photograph as balloon-garland, which was here first and is better named — the import re-added it under its filename, and both landed on /events, 123 KB for one picture twice',
    kind: 'photo',
    tags: ['balloons', 'street', 'props'],
    alt: { en: 'Titania Chaos in a yellow-green hat wearing a costume built from orange, purple, green and black balloons on a city street', bg: 'Титания Хаос с жълто-зелена шапка носи костюм от оранжеви, лилави, зелени и черни балони на градска улица', de: 'Titania Chaos mit gelbgrüner Mütze trägt ein Kostüm aus orangen, violetten, grünen und schwarzen Ballons auf einer Stadtstraße' },
    caption: { en: 'A shape the street has no category for is already half the joke.', bg: 'Форма, за която улицата няма категория, вече е половината шега.', de: 'Eine Form, für die die Straße keine Kategorie hat, ist schon der halbe Witz.' }
  },
  {
    id: 'a-img-9003',
    kind: 'photo',
    tags: ['portrait', 'props'],
    alt: { en: 'Titania Chaos in a black dress with a white collar and yellow tights, palms open, against a wooden wall', bg: 'Титания Хаос с черна рокля с бяла яка и жълт чорапогащник, с отворени длани, до дървена стена', de: 'Titania Chaos in schwarzem Kleid mit weißem Kragen und gelber Strumpfhose, die Handflächen offen, vor einer Holzwand' },
    caption: { en: 'Yellow legs under a serious dress: the argument in one costume.', bg: 'Жълти крака под сериозна рокля: спорът в един костюм.', de: 'Gelbe Beine unter einem ernsten Kleid: das Argument in einem Kostüm.' }
  },
  {
    id: 'a-img-9614',
    kind: 'photo',
    tags: ['portrait', 'props'],
    alt: { en: 'Close portrait of Titania Chaos with a red nose and a small pink puppet at her shoulder', bg: 'Близък портрет на Титания Хаос с червен нос и малка розова кукла на рамото ѝ', de: 'Nahes Porträt von Titania Chaos mit roter Nase und einer kleinen rosa Puppe an der Schulter' },
    caption: { en: 'The puppet gets to say the part the clown will not.', bg: 'Куклата казва онова, което клоунът няма да каже.', de: 'Die Puppe sagt den Teil, den der Clown nicht sagt.' }
  },
  {
    id: 'a-img-9687',
    draft: true,
    heldBack: 'the same photograph as wall-coat, a wider crop of it',
    kind: 'photo',
    tags: ['portrait', 'street'],
    alt: { en: 'Titania Chaos in a turquoise dress under a grey tweed coat, red nose on, outdoors', bg: 'Титания Хаос с тюркоазена рокля под сиво туидено палто, с червен нос, навън', de: 'Titania Chaos im türkisen Kleid unter grauem Tweedmantel, rote Nase, im Freien' },
    caption: { en: 'The coat is for the weather; the nose is not.', bg: 'Палтото е заради времето; носът — не.', de: 'Der Mantel ist wegen des Wetters; die Nase nicht.' }
  },
  {
    id: 'a-img-9785',
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'Titania Chaos in a houndstooth coat and round glasses with a small dark nose piece', bg: 'Титания Хаос с палто на пипит и кръгли очила с малък тъмен нос', de: 'Titania Chaos in einem Hahnentrittmantel mit runder Brille und kleinem dunklem Nasenstück' },
    caption: { en: 'A pattern loud enough to count as a second performer.', bg: 'Десен, достатъчно шумен, за да мине за втори артист.', de: 'Ein Muster, laut genug, um als zweiter Darsteller zu gelten.' }
  },
  {
    id: 'a-margareten-2',
    kind: 'photo',
    tags: ['street', 'portrait', 'solitude'],
    alt: { en: 'Black and white portrait of Titania Chaos in a cap and glasses on a Vienna street of tall old facades', bg: 'Черно-бял портрет на Титания Хаос с шапка и очила на виенска улица с високи стари фасади', de: 'Schwarz-weiß-Porträt von Titania Chaos mit Mütze und Brille in einer Wiener Straße mit hohen Altbaufassaden' },
    caption: { en: 'Margareten on an ordinary day, which is where the material comes from.', bg: 'Маргаретен в обикновен ден — оттам идва материалът.', de: 'Margareten an einem gewöhnlichen Tag, von dort kommt das Material.' }
  },
  {
    id: 'a-dsc4738',
    kind: 'photo',
    tags: ['portrait'],
    othersInFrame: 'three people, clearly identifiable',
    alt: { en: 'Titania Chaos in a red nose in conversation with three other people holding cups at an indoor gathering', bg: 'Титания Хаос с червен нос разговаря с още трима души с чаши в ръце на закрито събиране', de: 'Titania Chaos mit roter Nase im Gespräch mit drei weiteren Personen mit Bechern bei einem Treffen in Innenräumen' },
    caption: { en: 'The nose stays on after the show, which changes every conversation.', bg: 'Носът остава и след представлението, което променя всеки разговор.', de: 'Die Nase bleibt nach der Vorstellung auf, und das verändert jedes Gespräch.' }
  },
  {
    id: 'a-dsc4950',
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'a standing audience, many clearly identifiable',
    alt: { en: 'Titania Chaos performing on a small raised stage in a gallery to a standing audience', bg: 'Титания Хаос играе на малка повдигната сцена в галерия пред правостояща публика', de: 'Titania Chaos spielt auf einer kleinen erhöhten Bühne in einer Galerie vor stehendem Publikum' },
    caption: { en: 'A gallery lends its walls and takes back its silence.', bg: 'Галерията заема стените си и си взема обратно тишината.', de: 'Eine Galerie leiht ihre Wände und nimmt ihre Stille zurück.' }
  },
  {
    id: 'a-b3d70d9d-71eb-4a9b-b8f8-c53b0068727f',
    kind: 'photo',
    tags: ['stage', 'portrait'],
    alt: { en: 'Titania Chaos lit on a dark stage in a red comb headpiece, white collar and red nose', bg: 'Титания Хаос, осветена на тъмна сцена, с червена украса за глава, бяла яка и червен нос', de: 'Titania Chaos im Licht auf dunkler Bühne mit rotem Kopfschmuck, weißem Kragen und roter Nase' },
    caption: { en: 'The look that says the trouble has already started.', bg: 'Погледът, който казва, че бедата вече е започнала.', de: 'Der Blick, der sagt, dass der Ärger schon begonnen hat.' }
  },
  {
    id: 'a-cd563ea5-553b-422b-9723-bbc102345524',
    kind: 'photo',
    tags: ['birthday', 'balloons', 'street'],
    alt: { en: 'Titania Chaos seated outdoors behind a hand-painted sign reading Geburtstagsamt, with balloon animals on the table', bg: 'Титания Хаос седи навън зад ръчно изписана табела „Geburtstagsamt“, а на масата — балонени фигури', de: 'Titania Chaos sitzt im Freien hinter einem handgemalten Schild „Geburtstagsamt“, auf dem Tisch Ballontiere' },
    caption: { en: 'An office for birthdays, open to anyone having one.', bg: 'Служба за рождени дни, отворена за всеки, който има такъв.', de: 'Ein Amt für Geburtstage, offen für alle, die einen haben.' }
  },
  {
    id: 'a-de658a10-335c-4aa8-adf1-6681df61c1e0',
    kind: 'photo',
    tags: ['children', 'performance', 'props'],
    othersInFrame: 'children and adults at a public event, several clearly identifiable',
    alt: { en: 'Titania Chaos in stripes at a busy indoor event with families and a wooden cart behind her', bg: 'Титания Хаос на райета на оживено закрито събитие със семейства и дървена количка зад нея', de: 'Titania Chaos in Streifen bei einer belebten Hallenveranstaltung mit Familien und einem Holzwagen dahinter' },
    caption: { en: 'A hall this loud is won one family at a time.', bg: 'Толкова шумна зала се печели по едно семейство наведнъж.', de: 'So ein lauter Saal wird Familie für Familie gewonnen.' }
  },
  {
    id: 'a-e9b2ae95-a64f-40d1-9bbc-25df2c9a67e3',
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about twenty-five people, clearly identifiable',
    alt: { en: 'A large group of about twenty-five people posed together at the end of a training week', bg: 'Голяма група от около двадесет и пет души, застанали заедно в края на седмица обучение', de: 'Eine große Gruppe von etwa fünfundzwanzig Personen am Ende einer Trainingswoche' },
    caption: { en: 'Twenty-five people who spent a week failing in front of each other.', bg: 'Двадесет и пет души, прекарали седмица в провали един пред друг.', de: 'Fünfundzwanzig Menschen, die eine Woche lang voreinander gescheitert sind.' }
  },
  {
    id: 'a-f2ed9844-1e7c-4d3f-8391-2e2627046173',
    kind: 'photo',
    tags: ['portrait'],
    creator: 'Fedir Andriiovych Aleksandrovych (Федір Андрійович Александрович)',
    alt: {
      en: 'A framed line portrait of a clown by Fedir Andriiovych Aleksandrovych',
      bg: 'Рамкиран линеен портрет на клоун от Федір Андрійович Александрович',
      de: 'Gerahmtes Linienporträt eines Clowns von Fedir Andriiovych Aleksandrovych'
    },
    caption: {
      en: 'Clown portrait by Fedir Andriiovych Aleksandrovych (Федір Андрійович Александрович).',
      bg: 'Портрет на клоун от Федір Андрійович Александрович.',
      de: 'Clownporträt von Fedir Andriiovych Aleksandrovych (Федір Андрійович Александрович).'
    }
  },
  {
    id: 'b-img-1464',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1421',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1463',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1420',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1462',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-3748',
    draft: true,
    heldBack: 'the same moment as a-aed9ec2ec09f7956, a second apart — the August batch re-added what an earlier one already held',
    kind: 'photo',
    tags: ['stage', 'performance', 'props'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-7189',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'press'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-3806',
    draft: true,
    kind: 'photo',
    tags: ['workshop', 'children', 'performance'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-parade-portrait',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-dsc02596',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-7549',
    draft: true,
    kind: 'photo',
    tags: ['juggling', 'props', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-3750',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance', 'props'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1424',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1466',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1465',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1422',
    draft: true,
    kind: 'photo',
    tags: ['children', 'street', 'props', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-4998',
    draft: true,
    kind: 'video',
    seconds: 38,
    tags: ['workshop', 'performance'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-2046',
    draft: true,
    kind: 'video',
    seconds: 18,
    tags: ['street', 'solitude', 'props'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-8531',
    draft: true,
    kind: 'video',
    seconds: 15,
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-7614',
    draft: true,
    kind: 'video',
    seconds: 10,
    tags: ['stage', 'performance', 'props'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-5213',
    draft: true,
    kind: 'video',
    seconds: 39,
    tags: ['street', 'children', 'performance'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-2755',
    draft: true,
    kind: 'video',
    seconds: 35,
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-1816',
    draft: true,
    kind: 'video',
    seconds: 10,
    tags: ['stage', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-6401',
    draft: true,
    kind: 'video',
    seconds: 25,
    tags: ['street', 'props', 'solitude'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-6436',
    draft: true,
    kind: 'video',
    seconds: 16,
    tags: ['street', 'stage', 'performance', 'children'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-7960',
    draft: true,
    kind: 'video',
    seconds: 12,
    tags: ['street', 'performance', 'portrait'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-6558',
    draft: true,
    kind: 'video',
    seconds: 10,
    tags: ['street', 'performance', 'children'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  },
  {
    id: 'b-img-3107',
    draft: true,
    kind: 'video',
    seconds: 44,
    tags: ['stage', 'performance'],
    alt: {
      en: 'TODO what someone who cannot see it needs to know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    },
    caption: {
      en: 'TODO what someone who can see it might not know',
      bg: 'TODO the same, in Bulgarian',
      de: 'TODO the same, in German'
    }
  }
]

// Media imported from the August 2026 archive. Keeping the descriptions here
// beside the generated records makes the import auditable while publishing the
// frames in all three site languages.
const AUGUST_2026_MEDIA: Array<{
  id: string
  /** What someone who cannot see it needs to know, in en/bg/de. */
  alt: [string, string, string]
  /** What someone who can see it might not know. Never the alt again. */
  caption: [string, string, string]
  othersInFrame?: string
}> = [
  {
    id: 'b-img-1464',
    alt: [
      'Titania Chaos in a red costume smiling in a crowded street parade',
      'Титания Хаос в червен костюм се усмихва сред улично шествие',
      'Titania Chaos lächelt im roten Kostüm inmitten eines Straßenumzugs'
    ],
    caption: [
      'The crowd is behind a barrier and the clown is not. That is most of the job.',
      'Публиката е зад ограда, клоунът не е. Това е по-голямата част от работата.',
      'Das Publikum steht hinter der Absperrung, der Clown nicht. Das ist der größte Teil der Arbeit.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-img-1421',
    alt: [
      'Titania Chaos twirling a broad green patterned skirt during a street parade',
      'Титания Хаос завърта широка зелена шарена пола по време на улично шествие',
      'Titania Chaos wirbelt bei einem Straßenumzug einen breiten grün gemusterten Rock'
    ],
    caption: [
      'A skirt with enough cloth in it to furnish a room, opened in the middle of the road.',
      'Пола с толкова плат, че да обзаведе стая, разтворена насред улицата.',
      'Ein Rock mit genug Stoff für ein ganzes Zimmer, mitten auf der Straße geöffnet.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-img-1463',
    alt: [
      'Black-and-white street portrait of Titania Chaos in costume among parade spectators',
      'Черно-бял уличен портрет на Титания Хаос в костюм сред зрители на шествие',
      'Schwarzweißes Straßenporträt von Titania Chaos im Kostüm unter Zuschauenden'
    ],
    caption: [
      'Black and white takes the costume away and leaves the grin.',
      'Черно-бялото отнема костюма и оставя усмивката.',
      'Schwarzweiß nimmt das Kostüm weg und lässt das Grinsen.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-img-1420',
    alt: [
      'Titania Chaos high-fiving a spectator while moving through a street parade',
      'Титания Хаос дава пет на зрител по време на улично шествие',
      'Titania Chaos gibt einer Person beim Straßenumzug ein High Five'
    ],
    caption: [
      'Four strangers behind a railing, and every hand already knows what to do.',
      'Четирима непознати зад парапет и всяка ръка вече знае какво да прави.',
      'Vier Fremde hinter einem Geländer, und jede Hand weiß schon, was zu tun ist.'
    ],
    othersInFrame: 'spectators at a street parade'
  },
  {
    id: 'b-img-1462',
    alt: [
      'Titania Chaos posing in a red costume on a busy parade street',
      'Титания Хаос позира в червен костюм на оживена улица по време на шествие',
      'Titania Chaos posiert im roten Kostüm auf einer belebten Umzugsstraße'
    ],
    caption: [
      'The glasses are hers. Everything else belongs to the character, and the nose settles it.',
      'Очилата са нейни. Всичко останало е на образа, а носът решава спора.',
      'Die Brille gehört ihr. Alles andere gehört der Figur, und die Nase entscheidet.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-img-3748',
    alt: [
      'Titania Chaos kneeling onstage beside a wooden puppet and fellow performers',
      'Титания Хаос коленичи на сцената до дървена кукла и други артисти',
      'Titania Chaos kniet auf der Bühne neben einer Holzpuppe und weiteren Spielenden'
    ],
    caption: [
      'Titania Chaos kneeling onstage beside a wooden puppet and fellow performers',
      'Титания Хаос коленичи на сцената до дървена кукла и други артисти',
      'Titania Chaos kniet auf der Bühne neben einer Holzpuppe und weiteren Spielenden'
    ],
    othersInFrame: 'fellow performers on stage'
  },
  {
    id: 'b-img-7189',
    alt: [
      'Titania Chaos seated in front of a microphone during a radio appearance',
      'Титания Хаос седи пред микрофон по време на радио участие',
      'Titania Chaos sitzt bei einem Radioauftritt vor einem Mikrofon'
    ],
    caption: [
      'Radio: the one room where the nose would have been no help at all.',
      'Радио — единствената стая, в която носът нямаше да помогне с нищо.',
      'Radio — der einzige Raum, in dem die Nase überhaupt nichts genützt hätte.'
    ]
  },
  {
    id: 'b-img-3806',
    alt: [
      'Titania Chaos makes a playful quiet gesture to children and adults in a workshop',
      'Титания Хаос приканва за тишина деца и възрастни по време на работилница',
      'Titania Chaos bittet Kinder und Erwachsene in einem Workshop spielerisch um Ruhe'
    ],
    caption: [
      'One finger, and a room full of children goes quiet to find out why.',
      'Един пръст — и стая, пълна с деца, млъква, за да разбере защо.',
      'Ein Finger, und ein Raum voller Kinder wird still, um herauszufinden, warum.'
    ],
    othersInFrame: 'children and adults in a workshop'
  },
  {
    id: 'b-parade-portrait',
    alt: [
      'Titania Chaos in red costume and clown nose turns toward the camera in a parade crowd',
      'Титания Хаос в червен костюм и с клоунски нос се обръща към камерата сред шествие',
      'Titania Chaos im roten Kostüm und mit Clownsnase blickt inmitten eines Umzugs zur Kamera'
    ],
    caption: [
      'Turned to the camera for exactly as long as that took.',
      'Обърната към камерата точно толкова, колкото това отне.',
      'Der Kamera zugewandt, genau so lange wie es dauerte.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-dsc02596',
    alt: [
      'Titania Chaos performing onstage in a red dress with bright yellow sleeves',
      'Титания Хаос играе на сцена в червена рокля с яркожълти ръкави',
      'Titania Chaos spielt auf der Bühne in einem roten Kleid mit leuchtend gelben Ärmeln'
    ],
    caption: [
      'A dark stage, a red dress, and somebody else\'s striped legs waiting at the edge of it.',
      'Тъмна сцена, червена рокля и нечии чужди раирани крака, които чакат в края ѝ.',
      'Dunkle Bühne, rotes Kleid, und jemandes gestreifte Beine, die am Rand warten.'
    ]
  },
  {
    id: 'b-img-7549',
    alt: [
      'Titania Chaos balances a red juggling club upright on her nose',
      'Титания Хаос балансира червена жонгльорска бухалка върху носа си',
      'Titania Chaos balanciert eine rote Jonglierkeule auf ihrer Nase'
    ],
    caption: [
      'Balancing is mostly standing still and letting the club do the deciding.',
      'Балансирането е главно да стоиш неподвижно и да оставиш бухалката да решава.',
      'Balancieren heißt meist stillstehen und die Keule entscheiden lassen.'
    ]
  },
  {
    id: 'b-img-3750',
    alt: [
      'Titania Chaos performs from an upper balcony with a long decorated rope prop',
      'Титания Хаос играе от горен балкон с дълго украсено въже',
      'Titania Chaos spielt von einem oberen Balkon mit einem langen geschmückten Seil'
    ],
    caption: [
      'The rope goes down to the floor, which is where the audience is, which is the point.',
      'Въжето слиза до пода, където е публиката — там е и смисълът.',
      'Das Seil führt hinunter zum Boden, wo das Publikum ist, und darum geht es.'
    ]
  },
  {
    id: 'b-img-1424',
    alt: [
      'Titania Chaos gestures to the parade crowd with a giant puppet behind her',
      'Титания Хаос жестикулира към публиката на шествието, а зад нея има гигантска кукла',
      'Titania Chaos gestikuliert zur Umzugsmenge, hinter ihr eine riesige Puppe'
    ],
    caption: [
      'Upstaged by a giant in a tie, and waving anyway.',
      'Засенчена от гигант с вратовръзка — и въпреки това маха.',
      'Von einem Riesen mit Krawatte überstrahlt, und winkt trotzdem.'
    ],
    othersInFrame: 'people in a parade crowd'
  },
  {
    id: 'b-img-1466',
    alt: [
      'Titania Chaos performs in red costume while walking through a crowded street parade',
      'Титания Хаос играе в червен костюм сред многолюдно улично шествие',
      'Titania Chaos spielt im roten Kostüm in einem belebten Straßenumzug'
    ],
    caption: [
      'A parade is a corridor of strangers, and each one is briefly a partner.',
      'Шествието е коридор от непознати и всеки от тях за миг е партньор.',
      'Ein Umzug ist ein Korridor aus Fremden, und jeder davon ist kurz ein Partner.'
    ],
    othersInFrame: 'people in a street-parade crowd'
  },
  {
    id: 'b-img-1465',
    alt: [
      'Black-and-white portrait of Titania Chaos walking through a street crowd',
      'Черно-бял портрет на Титания Хаос сред улична тълпа',
      'Schwarzweißes Porträt von Titania Chaos in einer Straßenmenge'
    ],
    caption: [
      'The eyes are doing the work; the crowd behind them has gone soft.',
      'Работят очите; тълпата зад тях е омекнала.',
      'Die Augen machen die Arbeit; die Menge dahinter ist weich geworden.'
    ],
    othersInFrame: 'people in a street crowd'
  },
  {
    id: 'b-img-1422',
    alt: [
      'Close-up of Titania Chaos interacting with a child and a colourful toy in the street',
      'Близък план на Титания Хаос с дете и цветна играчка на улицата',
      'Nahaufnahme von Titania Chaos mit einem Kind und buntem Spielzeug auf der Straße'
    ],
    caption: [
      'The bubbles came out of a plastic dolphin and nobody present objected.',
      'Балончетата излизаха от пластмасов делфин и никой от присъстващите не възрази.',
      'Die Seifenblasen kamen aus einem Plastikdelfin, und niemand hatte etwas dagegen.'
    ],
    othersInFrame: 'a child at a public street event'
  },
  {
    id: 'b-img-4998',
    alt: [
      'Titania Chaos rehearses movement in a studio wearing pink patterned overalls',
      'Титания Хаос репетира движение в студио с розов шарен гащеризон',
      'Titania Chaos probt Bewegung im Studio in einer rosa gemusterten Latzhose'
    ],
    caption: [
      'Arms open to an empty rehearsal room, which is the hardest audience there is.',
      'Разтворени ръце към празна репетиционна зала — най-трудната публика.',
      'Arme geöffnet zu einem leeren Probenraum, dem schwersten Publikum überhaupt.'
    ]
  },
  {
    id: 'b-img-2046',
    alt: [
      'A camera moves through an empty graffiti-covered playground and performance yard',
      'Камерата преминава през празна площадка с графити и сценичен двор',
      'Die Kamera bewegt sich durch einen leeren, graffitibedeckten Spiel- und Auftrittshof'
    ],
    caption: [
      'An empty playground after rain, and something invisible to hold back.',
      'Празна детска площадка след дъжд и нещо невидимо, което да удържиш.',
      'Ein leerer Spielplatz nach dem Regen, und etwas Unsichtbares zum Aufhalten.'
    ]
  },
  {
    id: 'b-img-8531',
    alt: [
      'Titania Chaos gestures during an outdoor performance on a wooden platform',
      'Титания Хаос жестикулира по време на представление върху дървена платформа на открито',
      'Titania Chaos gestikuliert bei einem Auftritt auf einer Holzplattform im Freien'
    ],
    caption: [
      'Barefoot on stacked timber, in the corner of the park nobody had claimed yet.',
      'Боса върху струпани греди, в ъгъла на парка, който още никой не беше заел.',
      'Barfuß auf gestapelten Balken, in der Ecke des Parks, die noch niemand beansprucht hatte.'
    ]
  },
  {
    id: 'b-img-7614',
    alt: [
      'Titania Chaos performs onstage among brightly coloured fabric props',
      'Титания Хаос играе на сцена сред яркоцветни платнени реквизити',
      'Titania Chaos spielt auf der Bühne zwischen farbenfrohen Stoffrequisiten'
    ],
    caption: [
      'The cloth is up, and everything now depends on where it comes down.',
      'Платът е горе и всичко вече зависи от това къде ще падне.',
      'Das Tuch ist oben, und jetzt hängt alles davon ab, wo es landet.'
    ]
  },
  {
    id: 'b-img-5213',
    alt: [
      'Titania Chaos performs in red among families at an outdoor festival',
      'Титания Хаос играе в червено сред семейства на фестивал на открито',
      'Titania Chaos spielt in Rot zwischen Familien bei einem Festival im Freien'
    ],
    caption: [
      'A microphone at a festival, and a field that has not decided to listen yet.',
      'Микрофон на фестивал и поле, което още не е решило да слуша.',
      'Ein Mikrofon auf einem Festival, und ein Feld, das sich noch nicht entschieden hat zuzuhören.'
    ],
    othersInFrame: 'children and adults at an outdoor festival'
  },
  {
    id: 'b-img-2755',
    alt: [
      'Titania Chaos in a pale blue dress speaks through a megaphone beside a brick wall',
      'Титания Хаос в светлосиня рокля говори с мегафон до тухлена стена',
      'Titania Chaos spricht im hellblauen Kleid durch ein Megafon neben einer Backsteinwand'
    ],
    caption: [
      'A long green dress, a bridge, and a microphone leading nowhere in particular.',
      'Дълга зелена рокля, мост и микрофон, който не води доникъде конкретно.',
      'Ein langes grünes Kleid, eine Brücke und ein Mikrofon, das nirgendwohin führt.'
    ]
  },
  {
    id: 'b-img-1816',
    alt: [
      'Backstage selfie of Titania Chaos in a dark dress, white lace collar and red nose',
      'Задкулисно селфи на Титания Хаос с тъмна рокля, бяла дантелена яка и червен нос',
      'Backstage-Selfie von Titania Chaos im dunklen Kleid mit weißem Spitzenkragen und roter Nase'
    ],
    caption: [
      'A lace collar, a red nose, and a room that has gone dark behind them.',
      'Дантелена яка, червен нос и стая, която е потънала в тъмнина зад тях.',
      'Ein Spitzenkragen, eine rote Nase und ein Raum, der dahinter dunkel geworden ist.'
    ]
  },
  {
    id: 'b-img-6401',
    alt: [
      'Titania Chaos crouches beside a van wheel to inspect or repair it',
      'Титания Хаос е приклекнала до колело на бус, за да го огледа или поправи',
      'Titania Chaos hockt neben einem Kleinbus-Rad, um es zu prüfen oder zu reparieren'
    ],
    caption: [
      'The van is up on a jack, and the show is not going to wait for it.',
      'Бусът е вдигнат на крик, а представлението няма да го чака.',
      'Der Bus steht auf dem Wagenheber, und die Vorstellung wird nicht auf ihn warten.'
    ]
  },
  {
    id: 'b-img-6436',
    alt: [
      'Titania Chaos moves along an outdoor stage beside a seated family audience',
      'Титания Хаос се движи по сцена на открито до седнала семейна публика',
      'Titania Chaos bewegt sich über eine Freiluftbühne neben sitzendem Familienpublikum'
    ],
    caption: [
      'A whole kerb of hands went up at once, and there is only one of her.',
      'Цял тротоар ръце се вдигна наведнъж, а тя е една.',
      'Ein ganzer Randstein voller Hände ging auf einmal hoch, und es gibt nur eine von ihr.'
    ],
    othersInFrame: 'children and adults in the audience'
  },
  {
    id: 'b-img-7960',
    alt: [
      'Titania Chaos sings or speaks into a microphone during a street performance',
      'Титания Хаос пее или говори в микрофон по време на улично представление',
      'Titania Chaos singt oder spricht bei einem Straßenauftritt ins Mikrofon'
    ],
    caption: [
      'Singing to a square that holds one person on a bench, who has not looked up.',
      'Пее на площад, в който има един човек на пейка — и той не е вдигнал поглед.',
      'Singt einem Platz vor, auf dem eine Person auf der Bank sitzt und nicht aufgesehen hat.'
    ]
  },
  {
    id: 'b-img-6558',
    alt: [
      'A performer leaps over crouching children during an outdoor show',
      'Артист прескача приклекнали деца по време на представление на открито',
      'Ein Künstler springt bei einer Freiluftvorstellung über hockende Kinder'
    ],
    caption: [
      'The adults are face down in the road playing the game. The children are the audience now.',
      'Възрастните са по лице на пътя и играят. Публиката вече са децата.',
      'Die Erwachsenen liegen bäuchlings auf der Straße und spielen. Jetzt sind die Kinder das Publikum.'
    ],
    othersInFrame: 'a fellow performer and children in the audience'
  },
  {
    id: 'b-img-3107',
    alt: [
      'Titania Chaos shares an outdoor stage with a singer during a live performance',
      'Титания Хаос споделя сцена на открито с певец по време на живо представление',
      'Titania Chaos steht bei einem Live-Auftritt mit einem Sänger auf einer Freiluftbühne'
    ],
    caption: [
      'A stage built for a band, with one clown standing in the middle of it.',
      'Сцена, направена за група, и един клоун, застанал в средата ѝ.',
      'Eine Bühne für eine Band, und ein Clown steht mittendrin.'
    ],
    othersInFrame: 'a fellow performer on stage'
  }
]

for (const { id, alt, caption, othersInFrame } of AUGUST_2026_MEDIA) {
  const frame = FRAMES.find((item) => item.id === id)
  if (!frame) throw new Error(`August 2026 media record missing: ${id}`)
  // A frame held back on purpose stays held back. This table exists to give
  // the August import its words, and giving a frame its words is not a reason
  // to publish it — without this line a `heldBack` on any b- frame is deleted
  // here and the decision is silently undone.
  if (frame.heldBack) continue
  delete frame.draft
  // Alt and caption are separate fields because they are separate jobs. This
  // table used to carry one description per language and assign it to both,
  // which gave 27 published frames an alt identical to its caption: a screen
  // reader heard the description twice, and a sighted reader got a label where
  // the rest of the archive has a remark. It was not 27 mistakes, it was this
  // one line.
  frame.alt = { en: alt[0], bg: alt[1], de: alt[2] }
  frame.caption = { en: caption[0], bg: caption[1], de: caption[2] }
  if (othersInFrame) frame.othersInFrame = othersInFrame
}

// ---- what a reader sees --------------------------------------------------

const label = TAG_NAMES

const ui: Data['ui'] = {
  en: {
    region: 'Pictures and films on this page',
    photo: 'Photo',
    video: 'Film',
    play: 'Play',
    previous: 'Previous',
    next: 'Next',
    pause: 'Pause',
    resume: 'Resume',
    position: '%1 of %2',
    source: 'Watch on YouTube'
  },
  bg: {
    region: 'Снимки и филми на тази страница',
    photo: 'Снимка',
    video: 'Филм',
    play: 'Пусни',
    previous: 'Предишно',
    next: 'Следващо',
    pause: 'Пауза',
    resume: 'Продължи',
    position: '%1 от %2',
    source: 'Гледайте в YouTube'
  },
  de: {
    region: 'Bilder und Filme auf dieser Seite',
    photo: 'Foto',
    video: 'Film',
    play: 'Abspielen',
    previous: 'Zurück',
    next: 'Weiter',
    pause: 'Pause',
    resume: 'Weiter abspielen',
    position: '%1 von %2',
    source: 'Auf YouTube ansehen'
  }
}

// ---- the loader ----------------------------------------------------------

const PUBLIC = 'docs/public'
const DIR = '/images/media'
const DOCS = 'docs'

/** Dimensions of a published image, read from its header rather than declared. */
async function measure(url: string): Promise<{ width: number; height: number }> {
  let head: Buffer
  try {
    head = (await readFile(join(PUBLIC, url))).subarray(0, 64 * 1024)
  } catch {
    throw new Error(`media: ${url} is not in ${PUBLIC} — run media/make-media.mjs`)
  }
  const size = dimensions(head)
  if (!size) throw new Error(`media: could not read the dimensions of ${url}`)
  return size
}

// ---- reading the pages ----------------------------------------------------
//
// A frame is placed by writing `<MediaFigure tags="stage performance" />`
// inside a section, and it is displayed with the words around it: the
// section's heading is its title and the section's first paragraph is its
// text. Both are read from the Markdown here, at build time, rather than
// scraped out of the DOM in the browser -- so the hero renders server-side,
// works with JavaScript off, and is already correct in the HTML a search
// engine is served.
//
// The heading is rendered one level below its own: a figure in the page's h1
// section gets an h2 title, one in an h2 section gets an h3, and so on. The
// hero is therefore a map of the page in the page's own typography, and a
// slide's size tells you how deep in the page the picture actually sits.

/** Markdown inline syntax removed, so a heading or paragraph reads as text. */
function plain(md: string): string {
  return md
    .replace(/\{#[\w-]+\}\s*$/, '')          // the section id
    .replace(/\{\.[\w\s.-]+\}/g, '')         // attribute blocks like {.contact-button}
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const isHeading = (line: string) => /^(#{1,6}) +(.*)$/.exec(line)
const isProse = (line: string) =>
  line.trim() !== '' &&
  !/^[#>\-*+|:]/.test(line.trim()) &&
  !/^\d+\./.test(line.trim()) &&
  !/^<[A-Za-z]/.test(line.trim()) &&
  !/^!\[/.test(line.trim()) &&
  !/^\[[^\]]*\]\([^)]*\)\{/.test(line.trim()) // a link styled as a button

export interface Placement {
  /**
   * How the page asked, verbatim: the `tags` attribute, or `id:<frame>` when
   * the page named a frame outright. Unique within a page, because it is how
   * the component finds its own placement.
   */
  tags: string
  /** The frame the tags resolved to. */
  id: string
  /** The enclosing heading, as text. */
  title: string
  /** The level to render that title at: the heading's own level plus one. */
  level: number
  /** The section's first paragraph. Empty only if the section has no prose. */
  text: string
}

/** Every `<MediaFigure>` in one Markdown file, with the words around it. */
function readPage(source: string, fallbackTitle: string): Omit<Placement, 'id'>[] {
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')
  const lines = body.split('\n')

  // The heading each line sits under, and that heading's level.
  const found: Omit<Placement, 'id'>[] = []
  let title = fallbackTitle
  let level = 1
  let headingAt = -1

  for (let i = 0; i < lines.length; i++) {
    const heading = isHeading(lines[i])
    if (heading) {
      level = heading[1].length
      title = plain(heading[2])
      headingAt = i
      continue
    }
    // Two ways to ask. `tags` is "something like this" and lets the archive
    // choose; `id` is "this one", for a page whose words are about a
    // particular picture. Tags cannot express that: three frames here are
    // tagged exactly `portrait solitude`, so only the first is reachable by
    // tag, and a journal post about a dressing room should not have to settle
    // for whichever of them sorts first.
    const byId = /<MediaFigure[^>]*\bid="([^"]*)"/.exec(lines[i])
    const figure = byId ?? /<MediaFigure[^>]*\btags="([^"]*)"/.exec(lines[i])
    if (!figure) continue

    // The section's first paragraph: the first prose line after its heading
    // and before the next heading of the same level or shallower.
    //
    // Two sections on this site have no paragraph at all, and both still have
    // a first thing they say. The home page's testimonials are three
    // quotations; "What to expect" is a list. So a quotation, and then a list
    // item, stand in -- in that order, because a section that has both leads
    // with the quotation. Only a section that says nothing gets no text.
    let text = ''
    let quoted = ''
    let listed = ''
    for (let j = headingAt + 1; j < lines.length; j++) {
      const next = isHeading(lines[j])
      if (next && next[1].length <= level) break
      if (next) continue
      const line = lines[j].trim()
      if (isProse(lines[j])) { text = plain(lines[j]); break }
      if (!quoted && /^>/.test(line)) quoted = plain(line.replace(/^>\s?/, ''))
      if (!listed && /^[-*+] +\S/.test(line)) listed = plain(line.replace(/^[-*+] +/, ''))
    }

    found.push({
      tags: byId ? `id:${figure[1].trim()}` : figure[1].trim().replace(/\s+/g, ' '),
      title,
      level: Math.min(level + 1, 6),
      text: text || quoted || listed
    })
  }
  return found
}

/**
 * Ten per shared tag, plus up to three for how much of the frame was asked
 * about — a frame tagged only `press` answers `press` better than one that
 * carries press among five other things.
 *
 * That precision bonus is dropped when the page asked for `feed`. A synced
 * post's tags were guessed from its caption, so a post tagged
 * `street portrait feed` is not a worse answer to "the feed" than one tagged
 * `feed` alone — it is a post whose caption said more. Judging it on precision
 * ranked the vaguest post highest, which for a query that means "what is new"
 * is exactly backwards: with the bonus gone the scores tie and recency, which
 * is the order synced frames arrive in, decides.
 */
function score(frame: Frame, asked: string[]): number {
  const shared = frame.tags.filter((tag) => asked.includes(tag)).length
  if (shared === 0) return 0
  return asked.includes('feed') ? shared * 10 : shared * 10 + (shared / frame.tags.length) * 3
}

/**
 * Words long enough to mean something, in any of the three alphabets.
 *
 * Four letters and up, which drops `the`, `и`, `und`, `von`, `for` without a
 * stopword list per language — a list this site would have to keep in three.
 */
const words = (text: string): string[] =>
  [...String(text ?? '').toLowerCase().matchAll(/\p{L}{4,}/gu)].map((m) => m[0])

/**
 * How much a frame's own words have to do with the section it would sit in.
 *
 * The tags say what a section is about in fourteen words. The section itself
 * says it in its heading and its first paragraph, and every frame says it in
 * alt text and a caption written in the same three languages -- all of which
 * was read at build time already and thrown away. Two frames that tie on tags
 * used to be separated by their position in the array, which is to say by
 * nothing: `banana-encore` and `stage-gown` both carry `performance stage`,
 * and whichever was typed first won every time.
 *
 * A word only counts if it is rare enough to distinguish. `titania` is in
 * almost every caption and separates nothing; `trampoline` appears once and
 * separates everything. That is measured off the archive rather than declared,
 * so it stays true as the archive grows and needs no list to maintain.
 */
function relevance(frame: Frame, place: { title: string; text: string }, lang: Lang, rare: Set<string>): number {
  const asked = new Set(words(`${place.title} ${place.text}`).filter((w) => rare.has(w)))
  if (asked.size === 0) return 0
  const mine = new Set(words(`${frame.alt[lang]} ${frame.caption[lang]}`))
  let shared = 0
  for (const w of mine) if (asked.has(w)) shared++
  return shared
}

/**
 * The words worth matching on: those in fewer than two fifths of the frames.
 *
 * Computed once over the whole archive. A word carried by most of it says
 * nothing about which frame belongs where.
 */
function discriminating(frames: Frame[], lang: Lang): Set<string> {
  const seen = new Map<string, number>()
  for (const frame of frames) {
    for (const w of new Set(words(`${frame.alt[lang]} ${frame.caption[lang]}`))) {
      seen.set(w, (seen.get(w) ?? 0) + 1)
    }
  }
  const ceiling = Math.max(2, Math.floor(frames.length * 0.4))
  return new Set([...seen].filter(([, n]) => n <= ceiling).map(([w]) => w))
}

/**
 * Frames synced from the Instagram and Facebook accounts by
 * scripts/feed-sync.mjs, if that has ever run here.
 *
 * A post has one caption, in whichever language it was written in, and this
 * site is written in three. Rather than invent two translations or drop the
 * post, the caption stands in all three -- so a German reader may meet an
 * English sentence under an Instagram photograph. That is a visible seam, and
 * the honest one: the alternative is a machine translation nobody wrote.
 *
 * No manifest is not an error. A clone with no secrets has none, builds fine,
 * and simply has fewer pictures to choose from.
 */
async function synced(): Promise<Frame[]> {
  let manifest: {
    frames?: { id: string; tags: string[]; text: string; source: string; permalink: string; timestamp?: string }[]
  }
  try {
    manifest = JSON.parse(await readFile(join('docs/.vitepress', 'media-manifest.json'), 'utf8'))
  } catch {
    return []
  }
  const posts = [...(manifest.frames ?? [])].sort(
    (a, b) => Date.parse(b.timestamp ?? '') - Date.parse(a.timestamp ?? '')
  )
  return posts.map((f) => {
    const said = f.text?.trim() || 'A photograph from the Titania Chaos feed'
    const both = { en: said, bg: said, de: said }
    return {
      id: f.id,
      kind: 'photo' as const,
      source: f.source as Frame['source'],
      permalink: f.permalink,
      tags: f.tags.filter((t): t is Tag => (TAGS as readonly string[]).includes(t)),
      alt: both,
      caption: both
    }
  })
}

/**
 * How many published frames carry each tag, for the routes that have to know
 * how many pages a listing needs before the loader has run.
 *
 * Synced feed posts are deliberately not counted: they exist only for whoever
 * holds a token, so counting them would generate a page that is empty in every
 * other clone. If a feed post ever pushes a category past the last generated
 * page the pager links somewhere that was not built, and check-build says so.
 */
export function publishedPerTag(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const frame of FRAMES) {
    if (frame.draft) continue
    for (const tag of frame.tags) out[tag] = (out[tag] ?? 0) + 1
  }
  return out
}

export default defineLoader({
  watch: ['./*.md', './bg/*.md', './de/*.md', './public/images/media/*', './media-manifest.json'],
  async load(): Promise<Data> {
    const seen = new Set<string>()
    const used = new Set<Tag>()
    const owed: string[] = []
    const drafts: string[] = []
    const held: string[] = []
    const media: Media[] = []

    const all = [...FRAMES, ...(await synced())]

    for (const frame of all) {
      const where = `media ${frame.id}`
      if (seen.has(frame.id)) throw new Error(`${where}: duplicate id`)
      seen.add(frame.id)
      if (!/^[a-z][a-z0-9-]*$/.test(frame.id)) {
        throw new Error(`${where}: an id is a lowercase slug — it becomes a filename`)
      }

      if (frame.tags.length === 0) throw new Error(`${where}: no tags, so no page can ever ask for it`)
      for (const tag of frame.tags) {
        if (!(TAGS as readonly string[]).includes(tag)) {
          throw new Error(`${where}: "${tag}" is not one of ${TAGS.join(', ')}`)
        }
        used.add(tag)
      }

      // A draft is allowed to be unfinished; that is what makes it a draft.
      for (const field of ['alt', 'caption'] as const) {
        for (const lang of LANGS) {
          const value = frame[field][lang]?.trim()
          if (frame.draft) continue
          if (!value) throw new Error(`${where}: ${field} has no ${lang}`)
          // media/import-media.mjs writes a record with the words it cannot
          // know marked TODO. That marker must not survive to a page: alt text
          // reading "TODO what someone who cannot see it needs to know" is
          // worse than no alt text, because it looks filled in.
          if (/^TODO\b/.test(value)) {
            throw new Error(`${where}: ${field}.${lang} is still the placeholder from import — write the real words`)
          }
        }
      }

      // Every film on this site is served from this site. A video with no
      // length is a video with no file, because make-media.mjs writes the two
      // together.
      if (frame.kind === 'video' && !frame.seconds) {
        throw new Error(`${where}: a video needs its length in seconds — it is also how the file is found`)
      }
      if (frame.kind === 'photo' && frame.seconds) {
        throw new Error(`${where}: a photo has no length`)
      }

      if (frame.othersInFrame) owed.push(`${frame.id}: ${frame.othersInFrame}`)

      const file = `${DIR}/${frame.id}.webp`
      if (frame.draft) {
        if (frame.heldBack) held.push(`${frame.id}: ${frame.heldBack}`)
        else drafts.push(frame.id)
        continue
      }
      media.push({
        ...frame,
        file,
        tile: `${DIR}/${frame.id}-s.webp`,
        // The same focal point the square was cut on, in the form CSS wants,
        // so a crop at display size lands where the build-time crop did.
        anchor: (frame.focus ?? 'centre').replace('centre', 'center'),
        ...(frame.seconds ? { mp4: `${DIR}/${frame.id}.mp4` } : {}),
        ...(await measure(file))
      })
    }

    // A tag nothing carries is a tag a page can ask for and get silence. The
    // feed is the exception: it is empty until somebody with a token runs
    // scripts/feed-sync.mjs, and a clone with no secrets must still build.
    const orphans = TAGS.filter((tag) => tag !== 'feed' && !used.has(tag))
    if (orphans.length) {
      throw new Error(`media: nothing is tagged ${orphans.join(', ')} — drop the tag or tag a frame`)
    }

    // ---- resolve every placement on every page -----------------------------

    const placements: Record<string, Placement[]> = {}
    const usedOn: Record<string, PageRef[]> = {}
    const pageTags: Record<string, { ref: PageRef; tags: Tag[] }> = {}
    const empty: string[] = []
    let total = 0

    // What each frame costs the page that shows it. Every figure is charged
    // against a 500 KB budget, and on this site that budget is nearly spent —
    // so when two frames answer a section equally well, the cheaper one is the
    // better answer. Read once, from the files already on disk.
    const weight = new Map<string, number>()
    for (const frame of all) {
      if (frame.draft) continue
      try {
        weight.set(frame.id, (await stat(join(PUBLIC, `${DIR}/${frame.id}.webp`))).size)
      } catch {
        /* nothing derived yet; treated as weightless rather than fatal */
      }
    }

    // The discriminating vocabulary, per language, measured off the archive
    // once rather than per placement.
    const rare: Record<string, Set<string>> = {}
    for (const lang of LANGS) rare[lang] = discriminating(all, lang)

    for (const lang of LANGS) {
      const dir = lang === 'en' ? DOCS : join(DOCS, lang)
      // Subdirectories too: the journal lives in blog/, and a figure written
      // in a post is a figure like any other.
      const walk = async (from: string, prefix = ''): Promise<string[]> => {
        const out: string[] = []
        for (const e of await readdir(from, { withFileTypes: true }).catch(() => [])) {
          if (e.isDirectory()) {
            // Only this locale's own pages: docs/ contains docs/bg and docs/de.
            if (LANGS.includes(e.name as Lang)) continue
            out.push(...(await walk(join(from, e.name), `${prefix}${e.name}/`)))
          } else if (e.name.endsWith('.md')) out.push(`${prefix}${e.name}`)
        }
        return out
      }
      const names = await walk(dir)

      for (const name of names) {
        const source = await readFile(join(dir, name), 'utf8')
        const fallback = /^title:\s*(.+)$/m.exec(source)?.[1]?.replace(/^['"]|['"]$/g, '') ?? ''
        // What a link to this page should say: its own h1 where it has one,
        // and the front-matter title on the home page, which has none.
        const pageTitle = plain(/^# +(.+)$/m.exec(source)?.[1] ?? fallback)
        const wanted = readPage(source, fallback)
        if (wanted.length === 0) continue

        const slug = name.replace(/\.md$/, '')
        const key = `${lang}/${slug}`
        const takenTags = new Set<string>()
        const takenFrames = new Set<string>()
        const resolved: Placement[] = []
        const about = new Set<Tag>()
        const ref: PageRef = {
          lang, slug,
          path: `${lang === 'en' ? '' : '/' + lang}/${slug === 'index' ? '' : slug}`.replace(/\/$/, '') || '/',
          title: pageTitle
        }

        // Named frames are reserved before anything is searched for.
        //
        // A scored query and an `id:` placement draw from the same pool, and
        // the loop used to hand them out in document order — so a query high
        // on the page could take the very frame a later figure named outright,
        // and the build died with "b-img-4998 is already on this page". The
        // page did nothing wrong. An explicit naming is a decision and a query
        // is a question, so the decisions are settled first and the questions
        // answered from what is left.
        const reserved = new Set(
          wanted.filter((p) => p.tags.startsWith('id:')).map((p) => p.tags.slice(3))
        )

        for (const place of wanted) {
          // The lookup from component back to placement is by the tags string,
          // so two figures on a page may not ask for the same thing. They also
          // should not: two sections wanting the same picture is one section.
          if (takenTags.has(place.tags)) {
            throw new Error(`${key}: two MediaFigures ask for "${place.tags}" — a page's figures must differ`)
          }
          takenTags.add(place.tags)

          const named = place.tags.startsWith('id:') ? place.tags.slice(3) : null
          if (named) {
            const frame = all.find((f) => f.id === named)
            if (!frame) throw new Error(`${key}: MediaFigure id="${named}" — there is no such frame`)
            if (frame.draft) {
              throw new Error(
                `${key}: MediaFigure id="${named}" names a frame that is not published` +
                  (frame.heldBack ? ` — ${frame.heldBack}` : ' — its words are still TODO') +
                  '. Naming it outright would render nothing at all.'
              )
            }
            if (takenFrames.has(named)) throw new Error(`${key}: ${named} is already on this page`)
            takenFrames.add(named)
            resolved.push({ ...place, id: named })
            ;(usedOn[named] ??= []).push(ref)
            for (const tag of frame.tags) about.add(tag)
            total++
            continue
          }

          const asked = place.tags.split(' ').filter(Boolean)
          const unknown = asked.filter((tag) => !(TAGS as readonly string[]).includes(tag))
          if (unknown.length) {
            throw new Error(`${key}: MediaFigure asks for ${unknown.join(', ')}, which is not in the vocabulary`)
          }
          for (const tag of asked as Tag[]) about.add(tag)

          // Best score wins. On a tie a film wins over a photograph, and only
          // then does the archive's own order decide.
          //
          // The tie-break is not a preference, it is a correction. Three of
          // the five films carry exactly the tags of a photograph that sits
          // earlier in this file -- `banana-encore` has `performance stage`
          // and so does `stage-gown` -- so ordering alone buried every one of
          // them, permanently and invisibly. A site about a performer that
          // never shows her moving because of an array index is a bug.
          // Then, on a tie, what the section is actually about. The film rule
          // stays ahead of it because it corrects a real burial; the archive's
          // own order falls to last, where it belongs — it was never a
          // statement about anything.
          const best = all
            .map((frame, order) => ({
              frame,
              order,
              points: score(frame, asked),
              fits: relevance(frame, place, lang, rare[lang])
            }))
            // Not a draft. A draft has no derived file on the page and no
            // words yet, so when one won a query the figure rendered as
            // nothing at all -- `portrait` on work-with-titania resolved to
            // a-3bae0779b80bc772, a frame held back as somebody else's
            // drawing, and that section simply had no picture. Silently, on a
            // live page, because a blank figure looks like a section that was
            // never given one.
            .filter(
              (r) =>
                r.points > 0 &&
                !r.frame.draft &&
                !takenFrames.has(r.frame.id) &&
                !reserved.has(r.frame.id)
            )
            .sort(
              (a, b) =>
                b.points - a.points ||
                Number(b.frame.kind === 'video') - Number(a.frame.kind === 'video') ||
                b.fits - a.fits ||
                (weight.get(a.frame.id) ?? 0) - (weight.get(b.frame.id) ?? 0) ||
                a.order - b.order
            )[0]

          if (!best) {
            // A page may ask for the feed, and a clone with no secrets has no
            // feed. That is the one query allowed to come back empty: the
            // section simply has no picture, and the build stays green for
            // anyone without an Instagram token. Everything else is a mistake.
            if (asked.includes('feed')) {
              empty.push(`${key}: "${place.tags}" found nothing — no synced post matches`)
              continue
            }
            throw new Error(`${key}: nothing left carries "${place.tags}" — every frame that does is already on this page`)
          }
          takenFrames.add(best.frame.id)
          resolved.push({ ...place, id: best.frame.id })
          ;(usedOn[best.frame.id] ??= []).push(ref)
          total++
        }

        placements[key] = resolved
        // `feed` is a source, not a subject: a page asking for it is asking
        // for whatever was posted last, which says nothing about the page.
        const subjects = [...about].filter((tag) => tag !== 'feed')
        if (subjects.length) pageTags[key] = { ref, tags: subjects }
      }
    }

    if (drafts.length) {
      console.log(
        `\nmedia: ${drafts.length} frame(s) imported and waiting for their words — ` +
          'they are in the repository and on no page:\n  ' + drafts.join(', ') + '\n'
      )
    }

    if (held.length) {
      console.log(`\nmedia: ${held.length} frame(s) held back on purpose, not for want of words:`)
      for (const line of held) console.log(`  ${line}`)
      console.log('')
    }

    if (empty.length) {
      console.log(`\nmedia: ${empty.length} feed placement(s) found nothing — run scripts/feed-sync.mjs with a token:`)
      for (const line of empty) console.log(`  ${line}`)
    }

    if (owed.length) {
      console.log(
        `\nmedia: ${total} placements across ${Object.keys(placements).length} pages. ` +
          `${owed.length} frame(s) have somebody other than Titania in them (media/README.md):`
      )
      for (const line of owed) console.log(`  ${line}`)
      console.log('')
    }

    return { media, tags: [...TAGS], label, ui, placements, usedOn, pageTags }
  }
})
