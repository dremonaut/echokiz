import type { Phrase } from './types'

export const CATEGORIES = [
  'Notfall',
  'Körper',
  'Grundbedürfnisse',
  'Signale',
  'Personen',
  'Orte',
  'Aktivitäten',
  'Essen & Trinken',
  'Emotionen',
  'S-Laut',
] as const

/**
 * Built-in vocabulary. IDs must stay stable: recordings reference them via `phraseId`.
 * Never reuse an ID for a different text; give changed phrases a new ID instead.
 *
 * Spelling convention for target texts: single words without punctuation, starting with
 * a capital letter (like a one-word utterance); sentences with normal punctuation.
 *
 * The "S-Laut" category covers /s/ in all word positions (initial, medial, final) and in
 * clusters (z = ts, x/chs = ks, st inside or at the end of a word). Note that "st"/"sp" at the
 * start of a word (Stopp, Spielen) are pronounced "scht"/"schp" and do not train /s/.
 */
export const DEFAULT_PHRASES: Phrase[] = [
  // Notfall
  { id: 'w-hilfe', text: 'Hilfe', category: 'Notfall', emoji: '🆘' },
  { id: 'w-aua', text: 'Aua', category: 'Notfall', emoji: '🤕' },
  { id: 'w-stopp', text: 'Stopp', category: 'Notfall', emoji: '✋' },
  { id: 's-das-tut-weh', text: 'Das tut weh.', category: 'Notfall', emoji: '😣' },
  { id: 's-ich-brauche-hilfe', text: 'Ich brauche Hilfe.', category: 'Notfall', emoji: '🙋' },
  { id: 's-mir-ist-schlecht', text: 'Mir ist schlecht.', category: 'Notfall', emoji: '🤢' },
  { id: 's-ich-habe-angst', text: 'Ich habe Angst.', category: 'Notfall', emoji: '😨' },

  // Körper
  { id: 'w-kopf', text: 'Kopf', category: 'Körper', emoji: '🙆' },
  { id: 'w-bauch', text: 'Bauch', category: 'Körper', emoji: '👕' },
  { id: 'w-ohr', text: 'Ohr', category: 'Körper', emoji: '👂' },
  { id: 'w-zahn', text: 'Zahn', category: 'Körper', emoji: '🦷' },
  { id: 'w-nase', text: 'Nase', category: 'Körper', emoji: '👃' },
  { id: 'w-hals', text: 'Hals', category: 'Körper', emoji: '🧣' },
  { id: 'w-fuss', text: 'Fuß', category: 'Körper', emoji: '🦶' },
  { id: 's-mein-kopf-tut-weh', text: 'Mein Kopf tut weh.', category: 'Körper', emoji: '🤒' },
  { id: 's-mein-bauch-tut-weh', text: 'Mein Bauch tut weh.', category: 'Körper', emoji: '😖' },
  { id: 's-mein-hals-tut-weh', text: 'Mein Hals tut weh.', category: 'Körper', emoji: '😷' },

  // Grundbedürfnisse
  { id: 'w-wasser', text: 'Wasser', category: 'Grundbedürfnisse', emoji: '💧' },
  { id: 'w-hunger', text: 'Hunger', category: 'Grundbedürfnisse', emoji: '😋' },
  { id: 'w-durst', text: 'Durst', category: 'Grundbedürfnisse', emoji: '🥤' },
  { id: 'w-klo', text: 'Klo', category: 'Grundbedürfnisse', emoji: '🚽' },
  { id: 'w-muede', text: 'Müde', category: 'Grundbedürfnisse', emoji: '😴' },
  { id: 's-ich-moechte-wasser-trinken', text: 'Ich möchte Wasser trinken.', category: 'Grundbedürfnisse', emoji: '🚰' },
  { id: 's-ich-habe-hunger', text: 'Ich habe Hunger.', category: 'Grundbedürfnisse', emoji: '🍽️' },
  { id: 's-ich-habe-durst', text: 'Ich habe Durst.', category: 'Grundbedürfnisse', emoji: '🧃' },
  { id: 's-ich-muss-auf-die-toilette', text: 'Ich muss auf die Toilette.', category: 'Grundbedürfnisse', emoji: '🧻' },
  { id: 's-ich-bin-muede', text: 'Ich bin müde.', category: 'Grundbedürfnisse', emoji: '🥱' },
  { id: 's-mir-ist-kalt', text: 'Mir ist kalt.', category: 'Grundbedürfnisse', emoji: '🥶' },
  { id: 's-mir-ist-warm', text: 'Mir ist warm.', category: 'Grundbedürfnisse', emoji: '🥵' },
  { id: 's-ich-moechte-schlafen', text: 'Ich möchte schlafen.', category: 'Grundbedürfnisse', emoji: '🛌' },
  { id: 's-ich-bin-fertig', text: 'Ich bin fertig.', category: 'Grundbedürfnisse', emoji: '✅' },

  // Signale
  { id: 'w-ja', text: 'Ja', category: 'Signale', emoji: '👍' },
  { id: 'w-nein', text: 'Nein', category: 'Signale', emoji: '👎' },
  { id: 'w-bitte', text: 'Bitte', category: 'Signale', emoji: '🙏' },
  { id: 'w-danke', text: 'Danke', category: 'Signale', emoji: '🤗' },
  { id: 'w-mehr', text: 'Mehr', category: 'Signale', emoji: '➕' },
  { id: 'w-weg', text: 'Weg', category: 'Signale', emoji: '👋' },
  { id: 's-das-moechte-ich-nicht', text: 'Das möchte ich nicht.', category: 'Signale', emoji: '🙅' },
  { id: 's-gleich-nochmal', text: 'Gleich nochmal.', category: 'Signale', emoji: '🔁' },
  { id: 's-ich-weiss-nicht', text: 'Ich weiß nicht.', category: 'Signale', emoji: '🤷' },
  { id: 's-das-ist-gut', text: 'Das ist gut.', category: 'Signale', emoji: '👌' },
  { id: 's-was-ist-das', text: 'Was ist das?', category: 'Signale', emoji: '❓' },
  { id: 's-kannst-du-mir-helfen', text: 'Kannst du mir helfen?', category: 'Signale', emoji: '🤝' },
  { id: 's-schau-mal-da-drueben', text: 'Schau mal da drüben.', category: 'Signale', emoji: '👉' },

  // Personen (eigene Namen von Geschwistern, Freunden usw. am besten unter „Katalog“ ergänzen)
  { id: 'w-mama', text: 'Mama', category: 'Personen', emoji: '👩' },
  { id: 'w-papa', text: 'Papa', category: 'Personen', emoji: '👨' },
  { id: 'w-schwester', text: 'Schwester', category: 'Personen', emoji: '�' },
  { id: 'w-bruder', text: 'Bruder', category: 'Personen', emoji: '👦' },
  { id: 'w-noel', text: 'Noel', category: 'Personen', emoji: '👦' },
  { id: 'w-raphi', text: 'Raphi', category: 'Personen', emoji: '👦' },
  { id: 'w-oma', text: 'Oma', category: 'Personen', emoji: '👵' },
  { id: 'w-opa', text: 'Opa', category: 'Personen', emoji: '👴' },
  { id: 's-wo-ist-mama', text: 'Wo ist Mama?', category: 'Personen', emoji: '🔍' },
  { id: 's-papa-kommt-gleich', text: 'Papa kommt gleich.', category: 'Personen', emoji: '🚪' },
  { id: 's-ich-mag-dich', text: 'Ich mag dich.', category: 'Personen', emoji: '❤️' },

  // Orte
  { id: 'w-nach-hause', text: 'Nach Hause', category: 'Orte', emoji: '🏠' },
  { id: 'w-schule', text: 'Schule', category: 'Orte', emoji: '🏫' },
  { id: 'w-bett', text: 'Bett', category: 'Orte', emoji: '🛏️' },
  { id: 's-koennen-wir-nach-hause', text: 'Können wir nach Hause?', category: 'Orte', emoji: '🏡' },
  { id: 's-wir-gehen-in-die-schule', text: 'Wir gehen in die Schule.', category: 'Orte', emoji: '🎒' },
  { id: 's-ich-gehe-ins-bett', text: 'Ich gehe ins Bett.', category: 'Orte', emoji: '🌙' },
  { id: 's-gehen-wir-nach-draussen', text: 'Gehen wir nach draußen?', category: 'Orte', emoji: '🌳' },

  // Aktivitäten
  { id: 'w-spielen', text: 'Spielen', category: 'Aktivitäten', emoji: '🧸' },
  { id: 'w-malen', text: 'Malen', category: 'Aktivitäten', emoji: '🖍️' },
  { id: 'w-musik', text: 'Musik', category: 'Aktivitäten', emoji: '🎵' },
  { id: 'w-buch', text: 'Buch', category: 'Aktivitäten', emoji: '📖' },
  { id: 'w-schwimmen', text: 'Schwimmen', category: 'Aktivitäten', emoji: '🏊' },
  { id: 's-lass-uns-spielen', text: 'Lass uns spielen.', category: 'Aktivitäten', emoji: '🎲' },
  { id: 's-ich-moechte-malen', text: 'Ich möchte malen.', category: 'Aktivitäten', emoji: '🎨' },
  { id: 's-bitte-musik-anmachen', text: 'Bitte Musik anmachen.', category: 'Aktivitäten', emoji: '🎶' },
  { id: 's-lies-mir-ein-buch-vor', text: 'Lies mir ein Buch vor.', category: 'Aktivitäten', emoji: '📚' },
  { id: 's-das-macht-spass', text: 'Das macht Spaß.', category: 'Aktivitäten', emoji: '😄' },
  { id: 's-ich-will-aufraeumen', text: 'Ich will aufräumen.', category: 'Aktivitäten', emoji: '🧹' },
  { id: 's-wir-schauen-ein-video', text: 'Wir schauen ein Video.', category: 'Aktivitäten', emoji: '📺' },
  { id: 's-wir-bauen-einen-turm', text: 'Wir bauen einen Turm.', category: 'Aktivitäten', emoji: '🧱' },

  // Essen & Trinken
  { id: 'w-essen', text: 'Essen', category: 'Essen & Trinken', emoji: '🍽️' },
  { id: 'w-brot', text: 'Brot', category: 'Essen & Trinken', emoji: '🍞' },
  { id: 'w-apfel', text: 'Apfel', category: 'Essen & Trinken', emoji: '🍎' },
  { id: 'w-milch', text: 'Milch', category: 'Essen & Trinken', emoji: '🥛' },
  { id: 'w-saft', text: 'Saft', category: 'Essen & Trinken', emoji: '🧃' },
  { id: 'w-schokolade', text: 'Schokolade', category: 'Essen & Trinken', emoji: '🍫' },
  { id: 's-ich-moechte-ein-brot-essen', text: 'Ich möchte ein Brot essen.', category: 'Essen & Trinken', emoji: '🥪' },
  { id: 's-gib-mir-bitte-apfelsaft', text: 'Gib mir bitte Apfelsaft.', category: 'Essen & Trinken', emoji: '🍏' },
  { id: 's-das-schmeckt-gut', text: 'Das schmeckt gut.', category: 'Essen & Trinken', emoji: '🤤' },
  { id: 's-ich-bin-satt', text: 'Ich bin satt.', category: 'Essen & Trinken', emoji: '🙂' },

  // Emotionen
  { id: 'w-gluecklich', text: 'Glücklich', category: 'Emotionen', emoji: '😊' },
  { id: 'w-traurig', text: 'Traurig', category: 'Emotionen', emoji: '😢' },
  { id: 'w-wuetend', text: 'Wütend', category: 'Emotionen', emoji: '😠' },
  { id: 's-ich-freue-mich', text: 'Ich freue mich.', category: 'Emotionen', emoji: '😃' },
  { id: 's-ich-bin-traurig', text: 'Ich bin traurig.', category: 'Emotionen', emoji: '😞' },
  { id: 's-das-aergert-mich', text: 'Das ärgert mich.', category: 'Emotionen', emoji: '😤' },
  { id: 's-lass-mich-kurz-in-ruhe', text: 'Lass mich kurz in Ruhe.', category: 'Emotionen', emoji: '🤫' },

  // S-Laut: am Wortanfang
  { id: 'w-sonne', text: 'Sonne', category: 'S-Laut', emoji: '☀️' },
  { id: 'w-suppe', text: 'Suppe', category: 'S-Laut', emoji: '🍲' },
  { id: 'w-sofa', text: 'Sofa', category: 'S-Laut', emoji: '🛋️' },
  { id: 'w-seife', text: 'Seife', category: 'S-Laut', emoji: '🧼' },
  { id: 'w-socke', text: 'Socke', category: 'S-Laut', emoji: '🧦' },
  // S-Laut: in der Wortmitte
  { id: 'w-tasse', text: 'Tasse', category: 'S-Laut', emoji: '☕' },
  { id: 'w-hase', text: 'Hase', category: 'S-Laut', emoji: '🐰' },
  { id: 'w-rose', text: 'Rose', category: 'S-Laut', emoji: '🌹' },
  { id: 'w-dose', text: 'Dose', category: 'S-Laut', emoji: '🥫' },
  { id: 'w-kissen', text: 'Kissen', category: 'S-Laut', emoji: '💤' },
  // S-Laut: am Wortende
  { id: 'w-maus', text: 'Maus', category: 'S-Laut', emoji: '🐭' },
  { id: 'w-eis', text: 'Eis', category: 'S-Laut', emoji: '🍦' },
  { id: 'w-bus', text: 'Bus', category: 'S-Laut', emoji: '🚌' },
  { id: 'w-glas', text: 'Glas', category: 'S-Laut', emoji: '🫙' },
  { id: 'w-nuss', text: 'Nuss', category: 'S-Laut', emoji: '🥜' },
  { id: 'w-gras', text: 'Gras', category: 'S-Laut', emoji: '🌱' },
  // S-Laut: in Verbindungen (z = ts, chs/ks, st)
  { id: 'w-katze', text: 'Katze', category: 'S-Laut', emoji: '🐱' },
  { id: 'w-salz', text: 'Salz', category: 'S-Laut', emoji: '🧂' },
  { id: 'w-pilz', text: 'Pilz', category: 'S-Laut', emoji: '🍄' },
  { id: 'w-flugzeug', text: 'Flugzeug', category: 'S-Laut', emoji: '✈️' },
  { id: 'w-keks', text: 'Keks', category: 'S-Laut', emoji: '🍪' },
  { id: 'w-fuchs', text: 'Fuchs', category: 'S-Laut', emoji: '🦊' },
  { id: 'w-kiste', text: 'Kiste', category: 'S-Laut', emoji: '📦' },
  { id: 'w-nest', text: 'Nest', category: 'S-Laut', emoji: '🪺' },
  { id: 'w-wurst', text: 'Wurst', category: 'S-Laut', emoji: '🌭' },
  // S-Laut: Sätze mit vielen s-Lauten
  { id: 's-die-sonne-scheint', text: 'Die Sonne scheint.', category: 'S-Laut', emoji: '🌞' },
  { id: 's-der-hase-sitzt-im-gras', text: 'Der Hase sitzt im Gras.', category: 'S-Laut', emoji: '🐇' },
  { id: 's-die-maus-isst-kaese', text: 'Die Maus isst Käse.', category: 'S-Laut', emoji: '🧀' },
  { id: 's-das-ist-mein-haus', text: 'Das ist mein Haus.', category: 'S-Laut', emoji: '🏘️' },
  { id: 's-ich-esse-gern-eis', text: 'Ich esse gern Eis.', category: 'S-Laut', emoji: '🍨' },
  { id: 's-wir-fahren-mit-dem-bus', text: 'Wir fahren mit dem Bus.', category: 'S-Laut', emoji: '🚍' },
  { id: 's-ich-sitze-auf-dem-sofa', text: 'Ich sitze auf dem Sofa.', category: 'S-Laut', emoji: '🪑' },
  { id: 's-die-katze-ist-suess', text: 'Die Katze ist süß.', category: 'S-Laut', emoji: '🐈' },
  { id: 's-wo-sind-meine-socken', text: 'Wo sind meine Socken?', category: 'S-Laut', emoji: '👟' },
  { id: 's-ich-moechte-einen-keks', text: 'Ich möchte einen Keks.', category: 'S-Laut', emoji: '🥠' },
]

/** Merges built-in phrases with user-defined phrases (custom ones last). */
export function mergeCatalog(custom: Phrase[]): Phrase[] {
  const ids = new Set(DEFAULT_PHRASES.map((p) => p.id))
  return [...DEFAULT_PHRASES, ...custom.filter((p) => !ids.has(p.id))]
}

export function createCustomPhrase(text: string, category: string, emoji?: string): Phrase {
  return { id: `custom-${crypto.randomUUID()}`, text: text.trim(), category, emoji, custom: true }
}
