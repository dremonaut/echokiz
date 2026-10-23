# Inference requirements

Contract with `echokiz-whisper` (CR-002 there, REQ-SRV-*): `POST <base>/transcribe` with a raw 16 kHz mono WAV body (max. 30 s, about 2 MB), `Authorization: Bearer <token>`. Success `200`: `{ text, latency_ms, truncated, model_version, base_model, adapter }`. Errors: `{ error }` with `400/411/413/422` (request or audio), `401` (token), `403` (origin), `404`, `500`.

| ID | Requirement |
|---|---|
| REQ-INF-001 | Service URL and access token are entered in the free mode view („Vorhersage-Service“). They are stored only in `localStorage` (`echokiz.inference.url`, `echokiz.inference.token`), never in IndexedDB and never exported. The token input is masked. |
| REQ-INF-002 | Only `https:` URLs without embedded credentials are accepted. A trailing `/` is removed and `/transcribe` is appended unless already present. Invalid input is rejected with a German message and is not saved. |
| REQ-INF-003 | A prediction is requested only by an explicit user action for one recording. The request is a `POST` of the stored WAV as raw body with `Content-Type: audio/wav` and the Bearer token. |
| REQ-INF-004 | Without configured URL and token, or for audio longer than 30 s, no request is sent and the user sees a message. |
| REQ-INF-005 | The client aborts a request after 30 s. |
| REQ-INF-006 | On success the app shows the predicted text, the round-trip time in seconds, the model version and a hint if `truncated` is true. The text input is prefilled with the prediction. `predictedText` and `modelVersion` are stored on the recording right away; a new request overwrites them. |
| REQ-INF-007 | Each failure shows a readable German message: not configured, too long, timeout, network/CORS/private network (with hints to URL, https/Tailscale and the allowed origin), 401, 403, other 4xx (with the service's `error` text), 5xx, invalid response. Manual text entry stays possible in every case. |
