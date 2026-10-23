---
id: CR-001
date: 2026-10-23
title: Show predictions in the frontend and feed corrections back as training data
status: draft
---

## Background
EchoKiz currently only collects data: it records phrases, stores them in IndexedDB and exports them as a ZIP. The model is trained in the separate repo `dremonaut/echokiz-whisper`, but the app never uses the trained model, so there is no way to see what the model recognizes.

Each recording has a `targetText` (what the child was supposed to say), and the export writes it as `target_text` in `metadata.csv`. The training uses this text as the label. Today `targetText` always comes from a prompted phrase.

Wrong predictions are the most valuable training data, but there is no way to capture them: the app cannot show a prediction, and the user cannot correct it.

## Goal
From the user's perspective:
1. After recording, the app sends the audio to the local inference service of `echokiz-whisper` (see CR-002 there) and shows the recognized text.
2. The user confirms the prediction or corrects it.
3. The recording is stored with the confirmed or corrected text as `targetText` and is included in the next export. It becomes training data in the next `echokiz-whisper` run.
4. The app works as before when no inference service is configured or reachable. Recording and export never depend on it.

Model updates are not instant: the cycle is correct, export, retrain, restart the service.

## Scope
- Included:
  - Settings for the inference service: URL and access token, stored on the device only.
  - A way to request a prediction for a recording and display it, including a readable message when the service is unreachable, too slow or rejects the request.
  - A confirm/correct step for the prediction, with a text input for the correction.
  - Storing, per recording, where its text came from (prompted phrase, confirmed prediction, corrected prediction), the original predicted text and the model version reported by the service.
  - Extending the export (`metadata.csv` and `echokiz-export.json`) with these fields, backward compatible: older exports stay importable and `echokiz-whisper` can still read the old columns.
  - Unit tests for the new logic.
- Not included:
  - The inference service itself and all training, ingest and split changes (CR-002 in `echokiz-whisper`).
  - Running the model on the device or in the browser.
  - Hosting or exposing the service to the internet; how the phone reaches the PC.
  - Training inside the app or instant model updates.
  - Changing consent text or data model for speakers and sessions.

## Acceptance Criteria
- [ ] The user can enter and save the service URL and token; both stay on the device and are never part of an export.
- [ ] After a recording, the user can request a prediction and sees the recognized text and how long it took.
- [ ] If the service is not configured, unreachable or returns an error, the user sees a clear message and can still save the recording unchanged.
- [ ] The user can confirm the prediction or enter a corrected text; the stored `targetText` is the confirmed or corrected text.
- [ ] Each recording stores its text source (prompted, confirmed, corrected), the predicted text and the model version when a prediction was used.
- [ ] The export contains the new fields; an export without any predictions looks and imports as before.
- [ ] Existing recordings and exports from before this change remain readable and importable.
- [ ] The audio is sent only to the configured service and only when the user requests a prediction.
- [ ] Unit tests cover the new export fields and the text-source logic.

## Open Questions
- How does the phone reach the service (e.g. Tailscale, same Wi-Fi only)? GitHub Pages serves the app over https, so an http address would be blocked by the browser. This affects what URL formats the settings must accept.
- Are corrections only offered for prompted phrases, or also for free speech without a given phrase (new words outside the catalog)? The latter needs an entry point to record without a prompted phrase.
- Should the user have to confirm a correction a second time, or can corrections be flagged as "unsure", to limit typos in the training data?
- Does the prediction replace the prompted `targetText` when the child said something different from the prompt, or is the prompted text kept in addition?
