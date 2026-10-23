# Recording requirements

| ID | Requirement |
|---|---|
| REQ-REC-001 | Recording uses an AudioWorklet with mono input; echo cancellation, noise suppression and auto gain are off. The audio is resampled to 16 kHz, the microphone stays open between takes, the screen is kept awake while a recording view is open, and a denied microphone permission is shown as a readable message. |
| REQ-REC-002 | After stopping, silence is trimmed at start and end, keeping 300 ms of padding. Then the quality is checked: too short (< 0.3 s), too quiet (peak < 0.05), clipped (more than 0.1 % of the samples at ≥ 0.99). Issues are shown; the recording is saved anyway. |
| REQ-REC-003 | Recording requires a selected speaker; otherwise the view links to Sprecher. |
| REQ-REC-004 | Prompted mode (`/aufnahme`) shows the phrase with emoji, text and progress (n / 3). It offers a category filter and two orders, "Wenig aufgenommen zuerst" (default) and "Reihenfolge im Katalog"; the order is remembered in `localStorage` (`echokiz.order`). "◀" steps back through the visited phrases (up to 50). |
| REQ-REC-005 | A prompted recording stores `phraseId` and `category` of the phrase and `targetText` = phrase text. Its text source is `prompted`, also after the text was edited (REQ-REC-006). |
| REQ-REC-006 | The review of a prompted recording ("Für Erwachsene") offers playback, discard (deletes the recording), an editable "Gesagter Text" and an optional note. An empty "Gesagter Text" falls back to the phrase text. A recording with good quality adds a star and shows a celebration. |
| REQ-REC-007 | Free mode (`/frei`, nav entry „Frei sprechen“) records without a prompted phrase; prompted mode is unchanged. Free recordings have `phraseId = 'free'` and `category = 'Freies Sprechen'` and show no stars or celebration. |
| REQ-REC-008 | A free recording is saved immediately with an empty `targetText`. It is "ohne Text" until a text is saved. |
| REQ-REC-009 | The review of a free recording offers playback, discard, quality messages, „Erkennen lassen“ (REQ-INF-003) and a text input with „Text speichern“. A recording that is still "ohne Text" is pointed out and stays in Daten. |
| REQ-REC-010 | Labeling rule when a text is saved for a free recording: the text is trimmed; if it is empty, the recording stays "ohne Text". Without a stored prediction the source is `manual`. If the text equals the trimmed predicted text, the source is `confirmed`, otherwise `corrected`. `targetText` is always exactly the text the user saved; the app never sets it from the prediction on its own. |
| REQ-REC-011 | In Daten, unlabeled recordings are marked "ohne Text". A text can be added there with the rule of REQ-REC-010 (using the stored predicted text), or the recording can be deleted. Non-prompted recordings show their text source. |
