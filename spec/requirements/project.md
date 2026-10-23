# Project requirements

| ID | Requirement |
|---|---|
| REQ-PRJ-001 | The app is built with Vue 3 (Composition API, `<script setup>`) and TypeScript, bundled with Vite, with state in Pinia and routing in Vue Router (hash mode). Node.js 24 LTS; `npm ci` sets up a fresh clone. |
| REQ-PRJ-002 | Runtime dependencies are `vue`, `vue-router`, `pinia` and `fflate`. Dev dependencies include `vitest`, `fake-indexeddb` and `vue-tsc`. Prediction and settings use only `fetch` and `localStorage`; they add no dependency. |
| REQ-PRJ-003 | Layout: framework-free logic in `src/core/` with unit tests next to it (`*.test.ts`); the Pinia store in `src/stores/app.ts`; pages in `src/views/`; UI parts in `src/components/`; reusable logic in `src/composables/`; requirements in `spec/requirements/`; change requests in `spec/change_requests/`. |
| REQ-PRJ-004 | CI (`.github/workflows/deploy.yml`) runs `npm test` and `npm run build` (includes `vue-tsc`) on every push to `main` and deploys `dist/` to GitHub Pages (`https://dremonaut.github.io/echokiz/`). |
| REQ-PRJ-005 | The README describes purpose, features, quickstart, use on the phone via https, storage and backup, export format, privacy, free speech with prediction and the roadmap. Where it overlaps with these requirements, the requirements are authoritative. |
| REQ-PRJ-006 | All user-facing text is German. |

## Privacy

| ID | Requirement |
|---|---|
| REQ-PRV-001 | Data stays on the device in IndexedDB until the user exports it manually. There is no tracking, no analytics and no backend. The only exception is REQ-PRV-004. |
| REQ-PRV-002 | Speaker IDs are anonymous (suggestion `Kind_NN`). A speaker can only be created after the guardians' consent is confirmed; the consent is stored with a timestamp per speaker. |
| REQ-PRV-003 | Revoking consent deletes the speaker with all sessions and recordings from the device, after the user types the speaker ID to confirm (see REQ-STO-008). |
| REQ-PRV-004 | Audio leaves the device only when the user explicitly requests a prediction for a single free recording, and only to the configured https service (REQ-INF-001..003). Nothing is sent automatically or in the background. |
| REQ-PRV-005 | The README states that remote processing on the user's PC is not covered by the current consent text and that the access token is stored unencrypted in the browser's `localStorage`. |
