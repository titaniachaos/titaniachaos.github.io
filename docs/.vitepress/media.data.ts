import { defineLoader } from 'vitepress'
import { readFile, readdir } from 'node:fs/promises'
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
    tags: ['workshop', 'performance'],
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
    tags: ['street', 'performance', 'portrait', 'solitude'],
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
    tags: ['camera', 'performance', 'props'],
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
    tags: ['stage', 'portrait', 'performance'],
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
    tags: ['stage', 'performance', 'solitude'],
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
    tags: ['stage', 'performance', 'solitude'],
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
    tags: ['portrait', 'performance', 'solitude'],
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
    tags: ['street', 'performance', 'solitude'],
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
    tags: ['street', 'performance', 'solitude'],
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
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a second performer, clearly identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-0679147602f4d57d',
    draft: true,
    kind: 'photo',
    tags: ['props'],
    othersInFrame: 'a stock flat-lay of paints — not her photograph',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-06d135037c12fedf',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'a screenshot of somebody else\'s Instagram account, handle and words',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-3bae0779b80bc772',
    draft: true,
    kind: 'photo',
    tags: ['portrait'],
    othersInFrame: 'somebody else\'s drawing of the character',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-5214fe392c281774',
    draft: true,
    kind: 'photo',
    tags: ['workshop', 'children'],
    othersInFrame: 'children watching, one in costume',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-597e6067aaf640d3',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a young man, clearly identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-6929cbe7e418b679',
    draft: true,
    kind: 'photo',
    tags: ['children'],
    othersInFrame: 'a child, clearly identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-6bd9c2d47300f293',
    draft: true,
    kind: 'photo',
    tags: ['workshop', 'children'],
    othersInFrame: 'a child and a second adult',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-8b30b47754adaae4',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'about a dozen workshop participants',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-9eedf775a25a7a47',
    draft: true,
    kind: 'photo',
    tags: ['children', 'performance'],
    othersInFrame: 'several children in an audience',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-aed9ec2ec09f7956',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'two other performers',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-bf2c4943610a52c9',
    draft: true,
    kind: 'photo',
    tags: ['juggling', 'street'],
    othersInFrame: 'a second person, clearly identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-dfc28077d265745f',
    draft: true,
    kind: 'photo',
    tags: ['press'],
    othersInFrame: 'a partner organisation\'s logo, not a photograph',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-e4384cfe78cdc552',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'a musician in the background',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-71d43133-c678-4ee5-af41-53856f37ffa3',
    draft: true,
    kind: 'photo',
    tags: ['street', 'solitude', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-c6ab823a-6d6e-48cd-8dba-d3c2f158e590',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0013',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0468',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0491',
    draft: true,
    kind: 'photo',
    tags: ['props', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0494',
    draft: true,
    kind: 'photo',
    tags: ['props', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0511',
    draft: true,
    kind: 'photo',
    tags: ['portrait'],
    othersInFrame: 'a shoulder at the edge of frame',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0536',
    draft: true,
    kind: 'photo',
    tags: ['camera', 'children'],
    othersInFrame: 'children and adults at the camera',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0561',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-0825',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1208',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1272',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a group of adults and children',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1275',
    draft: true,
    kind: 'photo',
    tags: ['juggling', 'street'],
    othersInFrame: 'other people, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1320',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1353',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1355',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a second performer',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1366',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1406',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'a second person, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1414',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1419',
    draft: true,
    kind: 'photo',
    tags: ['children', 'street'],
    othersInFrame: 'a child, clearly identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1474',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'three men, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-1610',
    draft: true,
    kind: 'photo',
    tags: ['workshop', 'children'],
    othersInFrame: 'children and seated adults',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2173',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2193',
    draft: true,
    kind: 'photo',
    tags: ['portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2634',
    draft: true,
    kind: 'photo',
    tags: ['children', 'performance'],
    othersInFrame: 'children in the foreground',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2709',
    draft: true,
    kind: 'photo',
    tags: ['street', 'performance'],
    othersInFrame: 'distant passers-by',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2712',
    draft: true,
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2845',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-2906',
    draft: true,
    kind: 'photo',
    tags: ['props', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-3341',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-3608',
    draft: true,
    kind: 'video',
    seconds: 1,
    tags: ['performance', 'solitude'],
    othersInFrame: 'a bystander in the background',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-3630',
    draft: true,
    kind: 'video',
    seconds: 1,
    tags: ['workshop', 'children'],
    othersInFrame: 'children watching, and a second adult',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-3811',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'a large group, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-3834',
    draft: true,
    kind: 'photo',
    tags: ['workshop', 'children'],
    othersInFrame: 'a group including children',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-4187',
    draft: true,
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-4367',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-4503',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'a group of faces, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-4690',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-5951',
    draft: true,
    kind: 'photo',
    tags: ['camera', 'performance'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-6026',
    draft: true,
    kind: 'photo',
    tags: ['children', 'workshop'],
    othersInFrame: 'a group including a wheelchair user and children',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-6371',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-6421',
    draft: true,
    kind: 'photo',
    tags: ['street', 'juggling'],
    othersInFrame: 'a child in the background',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-6763',
    draft: true,
    kind: 'photo',
    tags: ['props', 'portrait'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-7052',
    draft: true,
    kind: 'photo',
    tags: ['street', 'portrait'],
    othersInFrame: 'a political banner behind her',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-7217',
    draft: true,
    kind: 'video',
    seconds: 1,
    tags: ['street', 'performance'],
    othersInFrame: 'passers-by, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-7288',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'a second performer, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-7300',
    draft: true,
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8040',
    draft: true,
    kind: 'photo',
    tags: ['street', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8092',
    draft: true,
    kind: 'video',
    seconds: 1,
    tags: ['props', 'solitude'],
    othersInFrame: 'no face visible',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8211',
    draft: true,
    kind: 'photo',
    tags: ['children', 'workshop'],
    othersInFrame: 'several children',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8521',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8528',
    draft: true,
    kind: 'photo',
    tags: ['props', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8569',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8628',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'a group, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-8734',
    draft: true,
    kind: 'photo',
    tags: ['balloons', 'street'],
    othersInFrame: 'other people\'s legs in frame',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-9003',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude', 'stage'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-9614',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-9687',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-img-9785',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-margareten-2',
    draft: true,
    kind: 'photo',
    tags: ['portrait', 'solitude', 'street'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-dsc4738',
    draft: true,
    kind: 'photo',
    tags: ['performance'],
    othersInFrame: 'a second person, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-dsc4950',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'performance'],
    othersInFrame: 'an audience, several identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-b3d70d9d-71eb-4a9b-b8f8-c53b0068727f',
    draft: true,
    kind: 'photo',
    tags: ['stage', 'portrait', 'solitude'],
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-cd563ea5-553b-422b-9723-bbc102345524',
    draft: true,
    kind: 'photo',
    tags: ['balloons', 'birthday'],
    othersInFrame: 'a person beside the sign',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-de658a10-335c-4aa8-adf1-6681df61c1e0',
    draft: true,
    kind: 'photo',
    tags: ['children', 'birthday'],
    othersInFrame: 'children at an event',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-e9b2ae95-a64f-40d1-9bbc-25df2c9a67e3',
    draft: true,
    kind: 'photo',
    tags: ['workshop'],
    othersInFrame: 'a large group, identifiable',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  },
  {
    id: 'a-f2ed9844-1e7c-4d3f-8391-2e2627046173',
    draft: true,
    kind: 'photo',
    tags: ['portrait'],
    othersInFrame: 'somebody else\'s drawing',
    alt: { en: 'TODO', bg: 'TODO', de: 'TODO' },
    caption: { en: 'TODO', bg: 'TODO', de: 'TODO' }
  }
]

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

export default defineLoader({
  watch: ['./*.md', './bg/*.md', './de/*.md', './public/images/media/*', './media-manifest.json'],
  async load(): Promise<Data> {
    const seen = new Set<string>()
    const used = new Set<Tag>()
    const owed: string[] = []
    const drafts: string[] = []
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
      if (frame.draft) { drafts.push(frame.id); continue }
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
          const best = all
            .map((frame, order) => ({ frame, order, points: score(frame, asked) }))
            .filter((r) => r.points > 0 && !takenFrames.has(r.frame.id))
            .sort(
              (a, b) =>
                b.points - a.points ||
                Number(b.frame.kind === 'video') - Number(a.frame.kind === 'video') ||
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
