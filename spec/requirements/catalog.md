# Catalog requirements

| ID | Requirement |
|---|---|
| REQ-CAT-001 | The built-in catalog (`src/core/catalog.ts`) has words and sentences with emoji in the categories Notfall, Körper, Grundbedürfnisse, Signale, Personen, Orte, Aktivitäten, Essen & Trinken, Emotionen and S-Laut. Phrase IDs are stable and are never reused for a different text. |
| REQ-CAT-002 | Spelling convention: single words are capitalized without punctuation; sentences use normal punctuation. |
| REQ-CAT-003 | Users can add custom phrases with text, category and an optional emoji. They are stored in IndexedDB and can be removed. The catalog shows the number of recordings per phrase for the current speaker. |
| REQ-CAT-004 | The target is 3 recordings per phrase (`REPETITIONS_PER_PHRASE`). Only recordings whose `phraseId` matches the phrase count; free recordings never count (REQ-REC-007). |
