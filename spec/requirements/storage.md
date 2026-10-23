# Storage requirements

| ID | Requirement |
|---|---|
| REQ-STO-001 | IndexedDB database `echokiz`, version `1`, with the stores `speakers` (key `id`), `sessions` (key `id`, index `speakerId`), `recordings` (auto-increment key `id`, indexes `speakerId` and `sessionId`) and `phrases` (key `id`, custom phrases only). Schema changes go through `DB_VERSION` and `onupgradeneeded`. |
| REQ-STO-002 | Each recording is stored right after stopping, before the review. Fields: `speakerId`, `sessionId`, `phraseId`, `targetText`, `category`, `notes?`, `duration`, `sampleRate`, `timestamp` (ISO), `device?` (user agent and device sample rate), `wav` (16-bit PCM WAV as `ArrayBuffer`) and the optional fields `textSource?` (`prompted` \| `confirmed` \| `corrected` \| `manual`), `predictedText?` and `modelVersion?`. |
| REQ-STO-003 | `textSource`, `predictedText` and `modelVersion` are optional and need no schema migration. Records without them stay valid and count as text source `prompted`. |
| REQ-STO-004 | The UI accesses storage only through the `EchoKizStorage` interface (`src/core/storage.ts`). |
| REQ-STO-005 | After a speaker is created, the app asks for persistent storage (`navigator.storage.persist()`). Usage, quota and persistence status are shown on Sprecher and Daten. |
| REQ-STO-006 | Speaker IDs are unique and non-empty. The selected speaker is remembered in `localStorage` (`echokiz.speaker`) and restored on start. |
| REQ-STO-007 | A session is created on the first recording after selecting a speaker. Its ID is `<speakerId>_Session_<NN>`, numbered per speaker with two digits. |
| REQ-STO-008 | Deleting a speaker deletes the speaker, its sessions and its recordings in one transaction. |
