 ---
id: CR-001
date: 2026-10-23
title: Show predictions in the frontend and feed corrections back as training data
status: implemented
---

## Background
EchoKiz currently only collects data: it records phrases, stores them in IndexedDB and exports them as a ZIP. The model is trained in the separate repo `dremonaut/echokiz-whisper`, but the app never uses the trained model, so there is no way to see what the model recognizes.

Each recording has a `targetText` (the training label), and the export writes it as `target_text` in `metadata.csv`. Today every recording belongs to a prompted phrase, and `targetText` starts as the phrase text. An adult can overwrite it in the review step ("Gesagter Text") if the child said something different.

Wrong predictions are the most valuable training data, but there is no way to capture them: the app cannot show a prediction, there is no way to record free speech without a prompted phrase, and the app cannot tell which labels came from a model prediction.

## Goal
From the user's perspective:
1. A new mode "Freies Sprechen" lets the child speak freely, without a prompted phrase. The existing recording flow with prompted phrases stays unchanged.
2. After a free recording, the user can request a prediction. The app sends the audio over https to the self-hosted inference service of `echokiz-whisper` (see CR-002 there) and shows the recognized text.
3. The adult confirms the prediction or replaces it with the text the child actually said.
4. The recording is stored with exactly the text the user confirmed or entered as `targetText`. If the user corrects the prediction, the corrected text always becomes the `targetText`; the app never keeps or picks the predicted text on its own. The recording is included in the next export and becomes training data in the next `echokiz-whisper` run.
5. If there is no prediction (service not configured, unreachable or failing), the adult can type the text manually, so free speech stays usable without the service.
6. Recording and export never depend on the service. A free recording without any text is kept but not exported until a text is added or it is discarded.

Model updates are not instant: the cycle is correct, export, retrain, restart the service.

## Scope
- Included:
  - Settings for the inference service: URL and access token, stored on the device only. Only `https://` URLs are accepted; anything else is rejected with a clear hint.
  - A new mode "Freies Sprechen" to record without a prompted phrase.
  - A way to request a prediction for a free recording and display it, including a readable message when the service is unreachable, too slow or rejects the request.
  - A confirm/replace step for the prediction, with a text input. The same text input allows manual entry when no prediction exists.
  - Storing, per recording, the text source (prompted phrase, confirmed prediction, corrected prediction, manually entered), the original predicted text and the model version reported by the service.
  - A visible state "ohne Text" for free recordings that have no text yet, and exclusion of these recordings from the export.
  - Extending the export (`metadata.csv` and `echokiz-export.json`) with the new fields, backward compatible: older exports stay importable and `echokiz-whisper` can still read the old columns.
  - Unit tests for the new logic.
- Not included:
  - The inference service itself and all training, ingest and split changes (CR-002 in `echokiz-whisper`).
  - Predictions for prompted phrases, and any change to the existing prompted recording flow, including its manual "Gesagter Text" field.
  - A separate "unsure" flag or a second confirmation step for entered texts. The text source and the stored predicted text are enough to identify these recordings; how they are weighted or filtered in training is decided in `echokiz-whisper`.
  - Running the model on the device or in the browser.
  - Hosting or exposing the service to the internet and how the phone reaches the PC. The service must be reachable via https.
  - Training inside the app or instant model updates.
  - Changing consent text or data model for speakers and sessions.

## Acceptance Criteria
- [ ] The user can enter and save the service URL and token; both stay on the device and are never part of an export.
- [ ] A URL that does not start with `https://` is rejected with a clear message and is not saved.
- [ ] The user can start a free recording without a prompted phrase; the existing prompted flow behaves as before.
- [ ] After a free recording, the user can request a prediction and sees the recognized text and how long it took.
- [ ] If the service is not configured, unreachable, too slow or returns an error, the user sees a clear message and can type the text manually instead.
- [ ] The user can confirm the prediction or enter a different text; the stored `targetText` is exactly the text the user confirmed or entered. After a correction it is always the corrected text, never the predicted one, which is kept only as the separate predicted-text field.
- [ ] Each free recording stores its text source (confirmed, corrected, manually entered); prompted recordings keep the source "prompted". The predicted text and the model version are stored when a prediction was used.
- [ ] A free recording without text is shown as "ohne Text", can be completed later or discarded, and is not part of the export.
- [ ] The export contains the new fields; existing columns keep their names, order and meaning, and an export of prompted recordings only can still be read by the old `echokiz-whisper` ingest.
- [ ] Existing recordings and exports from before this change remain readable and importable; older recordings count as text source "prompted".
- [ ] The audio is sent only to the configured service and only when the user requests a prediction.
- [ ] Unit tests cover the new export fields, the text-source logic and the URL validation.

## Open Questions
None.

Decision made during planning:
- The text source "manually entered" is exported as `text_source = manual`. CR-002 in `echokiz-whisper` (already implemented) only accepts `prompted`, `confirmed` and `corrected` and reports any other value as an invalid row. A follow-up CR in `echokiz-whisper` (CR-003 there) must accept `manual` and treat it like `confirmed`/`corrected` (train only). Until then, ingest reports `manual` rows as invalid; it does not mislabel them.

## Implementation Plan

### Requirement Changes
`spec/requirements/` exists but is empty. The Implementer creates the files below in the format of `echokiz-whisper/spec/requirements/`: a heading, optional short intro text, then a table `| ID | Requirement |` with one testable statement per ID. Each file contains the **current behavior (baseline, taken from the code as it is today)** plus the **additions of this CR (marked "CR-001" in the plan only, not in the files)**. Baseline values below are verified against the code and must not change behavior.

- `spec/requirements/project.md` (new). Section "Project":
  - REQ-PRJ-001: Vue 3 (Composition API, `<script setup>`) + TypeScript, built with Vite, state in Pinia, routing with Vue Router in hash mode. Node.js 24 LTS; `npm ci` sets up a fresh clone.
  - REQ-PRJ-002: Runtime dependencies are `vue`, `vue-router`, `pinia`, `fflate`. Dev dependencies include `vitest`, `fake-indexeddb`, `vue-tsc`. CR-001 adds no dependency (it uses `fetch` and `localStorage`).
  - REQ-PRJ-003: Layout:
    - Framework-free logic lives in `src/core/` with unit tests next to it (`*.test.ts`).
    - The Pinia store lives in `src/stores/app.ts`. Pages are in `src/views/`, UI parts in `src/components/` and reusable logic in `src/composables/`.
    - Requirements are in `spec/requirements/`, change requests in `spec/change_requests/`.
  - REQ-PRJ-004: CI (`.github/workflows/deploy.yml`) runs `npm test` and `npm run build` (includes `vue-tsc`) on every push to `main`. It deploys `dist/` to GitHub Pages (`https://dremonaut.github.io/echokiz/`).
  - REQ-PRJ-005: The README describes purpose, features, quickstart, use on the phone via https, storage and backup, export format, privacy and roadmap. CR-001: it also describes free speech with prediction and the service settings.
  - REQ-PRJ-006: All user-facing text is German.
- `spec/requirements/project.md`, section "Privacy":
  - REQ-PRV-001: Data stays on the device in IndexedDB until the user exports it manually. No tracking, no analytics, no backend. The only exception is REQ-PRV-004.
  - REQ-PRV-002: Speaker IDs are anonymous (suggestion `Kind_NN`). A speaker can only be created after the guardians' consent is confirmed; the consent is stored with a timestamp per speaker.
  - REQ-PRV-003: Revoking consent deletes the speaker with all sessions and recordings from the device after the user types the speaker ID to confirm (see REQ-STO-008).
  - REQ-PRV-004 (CR-001): Audio leaves the device only in these cases:
    - The user explicitly requests a prediction for a single free recording.
    - It is sent only to the configured https service (REQ-INF-001..003).
    - Nothing is sent automatically or in the background.
  - REQ-PRV-005 (CR-001): The README states these points:
    - Remote processing on the user's PC is not covered by the current consent text.
    - The access token is stored unencrypted in the browser's `localStorage`.
- `spec/requirements/storage.md` (new):
  - REQ-STO-001: IndexedDB database `echokiz`, version `1`, with these stores. Schema changes go through `DB_VERSION` and `onupgradeneeded`. CR-001 needs no schema change.
    - `speakers` (key `id`)
    - `sessions` (key `id`, index `speakerId`)
    - `recordings` (auto-increment key `id`, indexes `speakerId` and `sessionId`)
    - `phrases` (key `id`, custom phrases only)
  - REQ-STO-002: Each recording is stored right after stopping, before the review. It has the fields `speakerId`, `sessionId`, `phraseId`, `targetText`, `category`, `notes?`, `duration`, `sampleRate`, `timestamp` (ISO), `device?` (user agent and device sample rate) and `wav` (16-bit PCM WAV as `ArrayBuffer`). CR-001 adds the optional fields `textSource?` (`prompted` | `confirmed` | `corrected` | `manual`), `predictedText?` and `modelVersion?`.
  - REQ-STO-003 (CR-001): The fields from REQ-STO-002 that CR-001 adds are optional. Records without them stay valid and count as text source `prompted`.
  - REQ-STO-004: The UI accesses storage only through the `EchoKizStorage` interface (`src/core/storage.ts`).
  - REQ-STO-005: After a speaker is created, the app asks for persistent storage (`navigator.storage.persist()`). Usage, quota and persistence status are shown on Sprecher and Daten.
  - REQ-STO-006: Speaker IDs are unique and non-empty. The selected speaker is remembered in `localStorage` (`echokiz.speaker`) and restored on start.
  - REQ-STO-007: A session is created on the first recording after selecting a speaker. Its ID is `<speakerId>_Session_<NN>` (numbered per speaker, two digits).
  - REQ-STO-008: Deleting a speaker deletes the speaker, its sessions and its recordings in one transaction.
- `spec/requirements/catalog.md` (new, baseline only; CR-001 must not change it):
  - REQ-CAT-001: The built-in catalog (`src/core/catalog.ts`) has words and sentences with emoji in the categories Notfall, Körper, Grundbedürfnisse, Signale, Personen, Orte, Aktivitäten, Essen & Trinken, Emotionen, S-Laut. Phrase IDs are stable and are never reused for a different text.
  - REQ-CAT-002: Spelling convention: single words without punctuation and capitalized; sentences with normal punctuation.
  - REQ-CAT-003: Users can add custom phrases with text, category and an optional emoji. They are stored in IndexedDB and can be removed. The catalog shows the number of recordings per phrase for the current speaker.
  - REQ-CAT-004: The target is 3 recordings per phrase (`REPETITIONS_PER_PHRASE`). Only recordings whose `phraseId` matches the phrase count; free recordings never count (REQ-REC-007).
- `spec/requirements/recording.md` (new):
  - REQ-REC-001: Recording uses an AudioWorklet:
    - Mono input; echo cancellation, noise suppression and auto gain are off.
    - The audio is resampled to 16 kHz.
    - The microphone stays open between takes.
    - The screen is kept awake while a recording view is open.
    - A denied microphone permission is shown as a readable message.
  - REQ-REC-002: After stopping, silence is trimmed at start and end, keeping 300 ms of padding. Then the quality is checked: too short (< 0.3 s), too quiet (peak < 0.05), clipped (> 0.1 % of samples at ≥ 0.99). Issues are shown; the recording is saved anyway.
  - REQ-REC-003: Recording requires a selected speaker; otherwise the view links to Sprecher.
  - REQ-REC-004: Prompted mode (`/aufnahme`):
    - Shows the phrase with emoji, text and progress (n / 3).
    - Offers a category filter and two orders, "Wenig aufgenommen zuerst" (default) and "Reihenfolge im Katalog". The order is remembered in `localStorage` (`echokiz.order`).
    - "◀" steps back through the visited phrases (up to 50).
  - REQ-REC-005: A prompted recording stores `phraseId` and `category` of the phrase, and `targetText` = phrase text. Its text source is `prompted`. This also holds after the text is edited (REQ-REC-006).
  - REQ-REC-006: The review of a prompted recording ("Für Erwachsene") offers playback, discard (deletes the recording), an editable "Gesagter Text" and an optional note. An empty "Gesagter Text" falls back to the phrase text. A recording with good quality adds a star and shows a celebration.
  - REQ-REC-007 (CR-001): Free mode (`/frei`, nav entry „Frei sprechen“) records without a prompted phrase; prompted mode is unchanged.
    - Free recordings have `phraseId = 'free'` and `category = 'Freies Sprechen'`.
    - They show no stars or celebration.
  - REQ-REC-008 (CR-001): A free recording is saved immediately with an empty `targetText`. It is "ohne Text" until a text is saved.
  - REQ-REC-009 (CR-001): The review of a free recording offers playback, discard, quality messages, „Erkennen lassen“ (REQ-INF-003) and a text input with „Text speichern“. Leaving with an unlabeled recording shows that it stays in Daten as "ohne Text".
  - REQ-REC-010 (CR-001): Labeling rule when a text is saved for a free recording:
    - The text is trimmed. If it is empty, the recording stays "ohne Text".
    - Without a stored prediction, the source is `manual`.
    - If the text equals the trimmed predicted text, the source is `confirmed`; otherwise it is `corrected`.
    - `targetText` is always exactly the text the user saved. The app never sets it from the prediction on its own.
  - REQ-REC-011 (CR-001): In Daten, unlabeled recordings are marked "ohne Text". A text can be added there with the same rule (REQ-REC-010, using the stored predicted text), or the recording can be deleted. Non-prompted recordings show their text source.
- `spec/requirements/inference.md` (new, CR-001):
  - Intro: Contract with `echokiz-whisper` (CR-002 there, REQ-SRV-*). `POST /transcribe`; success `{ text, latency_ms, truncated, model_version, base_model, adapter }`; errors `{ error }`.
  - REQ-INF-001: Service URL and access token are entered in the free mode view („Vorhersage-Service“). They are stored only in `localStorage` (`echokiz.inference.url`, `echokiz.inference.token`). They are never stored in IndexedDB and never exported. The token input is masked.
  - REQ-INF-002: URL validation:
    - Only `https:` URLs without embedded credentials are accepted.
    - A trailing `/` is removed, and `/transcribe` is appended unless already present.
    - Invalid input is rejected with a German message and is not saved.
  - REQ-INF-003: A prediction is requested only by an explicit user action for one recording. The request is a `POST` of the stored WAV as raw body with `Content-Type: audio/wav` and an `Authorization` header with the Bearer scheme and the stored token.
  - REQ-INF-004: Without configured URL and token, or for audio longer than 30 s, no request is sent; the user sees a message.
  - REQ-INF-005: The client aborts a request after 30 s.
  - REQ-INF-006: On success the app shows the predicted text, the round-trip time in seconds, the model version and a hint if `truncated` is true. The text input is prefilled with the prediction. `predictedText` and `modelVersion` are stored on the recording right away, and a new request overwrites them.
  - REQ-INF-007: Each failure shows a readable German message: not configured, too long, timeout, network/CORS/private network (with hints to URL, https/Tailscale and the allowed origin), 401, 403, other 4xx (with the service's `error` text), 5xx, invalid response. Manual text entry stays possible in every case.
- `spec/requirements/export.md` (new):
  - REQ-EXP-001: The export is a ZIP in Hugging Face `audiofolder` layout with `metadata.csv`, `audio/*.wav` (stored without compression) and `echokiz-export.json`. `file_name` is relative to `metadata.csv`.
  - REQ-EXP-002: `metadata.csv` has these base columns in this order: `file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes`.
    - Every string field is quoted, and `"` is doubled.
    - `duration` is rounded to 2 decimals.
    - Rows are sorted by `timestamp`, and the file ends with a newline.
  - REQ-EXP-003: The audio file name is `audio/<YYYYMMDD>_<slug(targetText)>_<slug(speakerId)>_<id>.wav`. `slugify` lowercases, transliterates ä/ö/ü/ß, removes diacritics and replaces other characters with `_`.
  - REQ-EXP-004: `echokiz-export.json` contains `format: "echokiz-export"`, `version: 1`, `exportedAt`, `speakers` (with consent), `sessions` and `recordings`. The `recordings` rows are identical to the CSV rows.
  - REQ-EXP-005: Export is possible for the current speaker or for all speakers. The file is named `echokiz_<speakerId|alle>_<YYYY-MM-DD>.zip`. The time of the last export is stored (`echokiz.lastExport`), and a reminder is shown if there was no export or the last one is more than 7 days old.
  - REQ-EXP-006 (CR-001): The columns `text_source`, `predicted_text`, `model_version` are appended after `notes` only if at least one exported recording has a text source other than `prompted`. Otherwise CSV and JSON stay byte-identical to the output before CR-001. `text_source` is one of `prompted`, `confirmed`, `corrected`, `manual`; legacy records are exported as `prompted`. The JSON `recordings[]` rows carry the same keys.
  - REQ-EXP-007 (CR-001): Recordings "ohne Text" are excluded from CSV, JSON and `audio/`. The export message names the number of skipped recordings. If nothing is exportable, the user gets a message and no download.
  - REQ-EXP-008 (CR-001): The service settings (REQ-INF-001) are never part of the export.
- Interface contract with CR-002 (`echokiz-whisper`), to be used verbatim:
  - `POST <base>/transcribe`, header `Authorization: Bearer <token>`, header `Content-Type: audio/wav`, body = raw 16 kHz mono WAV (max. 30 s, max. ~2 MB).
  - Success `200`: `{ text, latency_ms, truncated, model_version, base_model, adapter }`. Errors: `{ error }` with `400/411/413/422` (audio/request), `401` (token), `403` (origin), `404`, `500`.
  - Export columns `text_source`, `predicted_text`, `model_version`; values `prompted` | `confirmed` | `corrected`, plus `manual` (see decision above). The same keys in `echokiz-export.json` `recordings[]`, identical to the CSV rows.

### Code Changes
1. `src/core/types.ts`:
   - Add `export type TextSource = 'prompted' | 'confirmed' | 'corrected' | 'manual'`.
   - Extend `Recording` with optional `textSource?: TextSource`, `predictedText?: string`, `modelVersion?: string`. Optional, so existing IndexedDB records and the prompted flow stay valid without a schema migration (`DB_VERSION` stays `1`; no new index needed).
   - Add constants `FREE_PHRASE_ID = 'free'` and `FREE_CATEGORY = 'Freies Sprechen'` for free recordings (`phraseId` stays a required string; the ID matches no catalog phrase, so `countsByPhrase`, `pickNextPhrase` and the catalog counts are unaffected).
2. `src/core/labeling.ts` (new, framework-free):
   - `textSourceOf(r)`: returns `r.textSource ?? 'prompted'` (legacy records count as prompted).
   - `isUnlabeled(r)`: `r.phraseId === FREE_PHRASE_ID && !r.targetText.trim()`.
   - `resolveLabel(text, predictedText?)` → `{ targetText, textSource }`. The text is trimmed. If it is empty, the result is unlabeled (`targetText: ''`, `textSource: undefined`). Otherwise, without a prediction the source is `manual`. With a prediction, the source is `confirmed` if the text equals `predictedText.trim()` exactly and `corrected` otherwise. `targetText` is always the user's text and never the predicted text (CR Goal 4).
3. `src/core/inference.ts` (new, framework-free; `fetch` and `Storage` are injectable for tests):
   - `normalizeServiceUrl(input)`: parses with `new URL`, requires protocol `https:`, rejects embedded credentials, strips a trailing `/`, and appends `/transcribe` unless already present. Throws an `Error` with a German message (e.g. „Nur https://-Adressen sind erlaubt …“).
   - `loadInferenceSettings(storage = localStorage)` / `saveInferenceSettings(settings, storage)`: keys `echokiz.inference.url` and `echokiz.inference.token`. These are only in `localStorage`, never in IndexedDB, so they cannot reach the export. Saving validates the URL first, and an invalid URL is not saved.
   - `requestPrediction(wav, settings, { timeoutMs = 30000, fetchFn = fetch })`:
     - Before sending, it rejects missing settings and audio longer than 30 s, without a network call.
     - It POSTs per the contract with an `AbortController` timeout and measures the round trip with `performance.now()`.
     - It returns `{ text, modelVersion, truncated, roundTripMs, serverLatencyMs }`.
     - It maps failures to a `PredictionError` with a `kind` (`not_configured`, `too_long`, `timeout`, `network`, `unauthorized`, `forbidden`, `rejected`, `server`, `invalid_response`) and a readable German message. The service's `error` text is shown for 4xx. The `network` kind also covers CORS and Private Network Access failures, so its message points to URL, Tailscale/https and the allowed origin.
4. `src/stores/app.ts` (`updateRecording`): widen the `changes` type to `Pick<Recording, 'targetText' | 'notes' | 'textSource' | 'predictedText' | 'modelVersion'>`. Add a computed `unlabeledCount` (current speaker) for the "ohne Text" hint. No other store changes; `saveRecording` already accepts the extended `Recording`.
5. `src/views/FreeSpeechView.vue` (new) and `src/router.ts` / `src/App.vue`:
   - Route `/frei` (name `free`, lazy-loaded) and a nav link „Frei sprechen“. `RecordView.vue` is not touched.
   - Recording: same pattern as `RecordView` (`Recorder`, `WaveformCanvas`, `trimSilence`, `analyzeQuality`, `keepScreenAwake`, `ensureSession`). The take is saved immediately with `phraseId: FREE_PHRASE_ID`, `category: FREE_CATEGORY`, `targetText: ''` (unlabeled), so a crash cannot lose it.
   - Review card („Für Erwachsene“): play, discard, quality messages.
     - Button „🤖 Erkennen lassen“: only on click, `getWav(id)` → `requestPrediction`. It is disabled while a request runs; when not configured, it shows a hint to open the settings. The audio is never sent automatically (AC "only when the user requests").
     - On success: show the predicted text, the round-trip time (e.g. „1,4 s“), the model version and a warning if `truncated`. Prefill the text input with the prediction, and store `predictedText` and `modelVersion` on the recording immediately. A repeated request overwrites both.
     - On error: show `PredictionError.message`; the text input stays usable for manual entry.
     - Text input plus button „✓ Text speichern“ → `resolveLabel(text, recording.predictedText)` → `updateRecording`. Show the resulting source (bestätigt / korrigiert / eingegeben). An empty input keeps the recording "ohne Text".
     - „Neue Aufnahme“ resets the review. If the current take is still unlabeled, show a short note that it stays under Daten as „ohne Text“.
   - Settings card (`<details>` „Vorhersage-Service“ in this view): URL input, token input (`type="password"`), Save button using `saveInferenceSettings`, with validation errors shown inline. A note that the audio leaves the device only on „Erkennen lassen“ and goes only to this address.
6. `src/core/export.ts`:
   - `MetadataRow`: add optional `text_source`, `predicted_text`, `model_version`.
   - `exportableRecordings(recs)`: filters out `isUnlabeled` recordings.
   - `toMetadataRow`: fill the three fields (`textSourceOf`, `predictedText ?? ''`, `modelVersion ?? ''`).
   - `toCsv(rows, columns)` / `buildDatasetZip`: append the three columns after `notes` only if at least one exported recording has a source other than `prompted`. Otherwise, header and rows are byte-identical to today. JSON `recordings[]` use the same column set as the CSV, and `version` stays `1` because the change is additive. `buildDatasetZip` applies `exportableRecordings` itself.
7. `src/views/DataView.vue`:
   - Export: count via `exportableRecordings`. Message e.g. „12 Aufnahmen exportiert, 2 ohne Text übersprungen.“ If nothing is exportable, say so instead of downloading.
   - Table: for unlabeled rows, show a badge „ohne Text“ and an inline input with a Save button using `resolveLabel(text, r.predictedText)`, so a text can be added later. Discarding works via the existing delete. For non-prompted rows, show a small source badge (bestätigt / korrigiert / eingegeben).
   - Hint above the export when `unlabeledCount > 0`.
8. `.github/workflows/deploy.yml`: no change (tests already run there).
9. `README.md`:
   - Features: „Freies Sprechen mit Vorhersage“.
   - IndexedDB schema: new optional fields.
   - `metadata.csv` schema: optional columns and their values, and when they appear.
   - Privacy: audio is sent only on explicit request, only to the configured https service, and remote processing is not covered by the current consent text, analogous to CR-002. The token is stored unencrypted in `localStorage` on the device.
   - Project structure: `inference.ts`, `labeling.ts`, `FreeSpeechView.vue` and `spec/`.
   - Roadmap Phase 5: partially done.
   - The README must not contradict the requirement files; where they overlap (export schema, IndexedDB schema, privacy), the requirement files are authoritative.

### Tests
Each new test name or `describe` block names the requirement it covers (e.g. `REQ-REC-010`), so coverage can be traced.
- `src/core/labeling.test.ts` (new, REQ-REC-008/010, REQ-STO-003):
  - `textSourceOf` defaults to `prompted` for legacy records.
  - `resolveLabel`: equal text → `confirmed`; changed text (including only case or punctuation) → `corrected` with the corrected `targetText`; whitespace-only differences → `confirmed`; no prediction → `manual`; empty text → unlabeled.
  - `isUnlabeled` is only true for free recordings without text.
- `src/core/inference.test.ts` (new, REQ-INF-001..007, mocked `fetchFn`, in-memory `Storage`):
  - URL validation: `https` is accepted, `/transcribe` is appended, `http`, invalid and credential URLs are rejected, and an invalid URL is not saved.
  - Request: method, `Authorization: Bearer`, `Content-Type`, body = WAV, success parsing.
  - Error mapping: 401, 403, 413, 422 (with service message), 500, network `TypeError`, timeout (small `timeoutMs`), invalid JSON, `not_configured`, `too_long` without a fetch call.
- `src/core/export.test.ts` (extend, REQ-EXP-002/006/007/008):
  - The existing header assertion stays unchanged for all-prompted exports.
  - A mixed export appends `text_source,predicted_text,model_version` after `notes` with correct values (`prompted` for legacy rows).
  - JSON `recordings[]` contain the same keys.
  - Unlabeled free recordings are excluded from CSV, JSON and `audio/`.
  - No settings keys or token appear in the ZIP.
- `src/core/storage-idb.test.ts` (extend, REQ-STO-002/003): a recording with the new fields round-trips; a record without them is still read.
- Focused run: `npx vitest run src/core`, then `npm run typecheck` (covers the views and the store). Final check: `npm test` and `npm run build`.
- Requirement files are documentation only; no test validates them. Before finishing, check that every requirement marked CR-001 in the plan is covered by a test or by the manual check below, and that every baseline value still matches the code.
- Manual check (no UI test framework in the repo): on the phone via GitHub Pages or the cloudflare tunnel against `echokiz-whisper serve` behind `tailscale serve`. Cover success, wrong token, service stopped, an `http://` URL and „ohne Text“ → complete later in Daten → export. Also confirm prompted mode is unchanged (REQ-REC-004..006).

### Order and Dependencies
0. Requirement files first (`spec/requirements/*.md`, see Requirement Changes). They fix names and values (IDs, `localStorage` keys, column order, labeling rule) that the code steps use.
1. Step 1 (types) after the requirement files. Steps 2 and 3 depend only on it and are independent of each other.
2. Step 6 (export) depends on 2. Step 4 (store) depends on 1.
3. Step 5 (FreeSpeechView) depends on 2, 3 and 4. Step 7 (DataView) depends on 2, 4 and 6.
4. Tests go with each core step. Step 9 (README) goes last and is checked against the requirement files.
5. External: the follow-up CR in `echokiz-whisper` for `manual` can run in parallel. It must be done before exports with typed-in free recordings are ingested.

### Risks and Assumptions
- **Baseline requirements:** They describe today's behavior as found in the code (thresholds, keys, file names, column order). Writing them down must not change any behavior. If the Implementer finds a mismatch between code and a baseline value in the plan, the code wins and the requirement is corrected; it is not a reason to change code in this CR.
- **Scope of the requirement files:** The plan documents the whole app, including the catalog, which CR-001 does not change. This gives a complete starting point for later CRs. Requirement IDs follow the `echokiz-whisper` scheme (`REQ-<AREA>-NNN`); the areas `PRJ`, `PRV`, `STO`, `CAT`, `REC`, `INF`, `EXP` are new to this repo.
- **`manual` before the follow-up CR:** `echokiz-whisper` ingest reports `manual` rows as invalid and skips them until it accepts the value. Prompted, confirmed and corrected rows are unaffected.
- **Browser network rules:** CORS (the service only allows the configured origin, default `https://dremonaut.github.io`) and Chrome's Private/Local Network Access towards Tailscale addresses can block requests. Both surface as a generic network error; the message explains likely causes, but the app cannot tell them apart.
- **Token in `localStorage`:** readable by any script on the same origin and kept until the browser data is cleared. This is acceptable for a self-hosted service; it is documented in the README.
- **Confirmed vs. corrected** uses exact comparison after trimming; a casing or punctuation fix counts as `corrected`. `echokiz-whisper` normalizes texts anyway and treats both as train-only.
- **"How long it took"** shows the client round-trip time (network plus inference); the server's `latency_ms` is kept only for display or debugging and is not stored.
- **Assumptions:**
  - The settings live in the „Frei sprechen“ view rather than a separate settings page.
  - Adding a text later in Daten is manual only (no new prediction request from the table).
  - A free recording's `category` is „Freies Sprechen“.
  - No stars or celebration in free mode.
  - The client timeout is 30 s.
  - Free recordings longer than 30 s are saved but cannot be sent for a prediction (clear message, manual entry possible).
- **Code duplication:** `FreeSpeechView` repeats the recording handling of `RecordView` instead of extracting a shared composable, to keep the prompted flow untouched as required by the CR.
