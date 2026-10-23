# Export requirements

| ID | Requirement |
|---|---|
| REQ-EXP-001 | The export is a ZIP in Hugging Face `audiofolder` layout with `metadata.csv`, `audio/*.wav` (stored without compression) and `echokiz-export.json`. `file_name` is relative to `metadata.csv`. |
| REQ-EXP-002 | `metadata.csv` has the base columns `file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes` in this order. Every string field is quoted and `"` is doubled; `duration` is rounded to 2 decimals; rows are sorted by `timestamp`; the file ends with a newline. |
| REQ-EXP-003 | The audio file name is `audio/<YYYYMMDD>_<slug(targetText)>_<slug(speakerId)>_<id>.wav`. `slugify` lowercases, transliterates ä/ö/ü/ß, removes diacritics and replaces other characters with `_`. |
| REQ-EXP-004 | `echokiz-export.json` contains `format: "echokiz-export"`, `version: 1`, `exportedAt`, `speakers` (with consent), `sessions` and `recordings`. The `recordings` rows are identical to the CSV rows. |
| REQ-EXP-005 | Export is possible for the current speaker or for all speakers. The file is named `echokiz_<speakerId\|alle>_<YYYY-MM-DD>.zip`. The time of the last export is stored (`echokiz.lastExport`); a reminder is shown if there was no export or the last one is more than 7 days old. |
| REQ-EXP-006 | The columns `text_source`, `predicted_text`, `model_version` are appended after `notes` only if at least one exported recording has a text source other than `prompted`. Otherwise CSV and JSON are byte-identical to an export without these fields. `text_source` is one of `prompted`, `confirmed`, `corrected`, `manual`; legacy records are exported as `prompted`. The JSON `recordings[]` rows carry the same keys. |
| REQ-EXP-007 | Recordings "ohne Text" are excluded from CSV, JSON and `audio/`. The export message names the number of skipped recordings. If nothing is exportable, the user gets a message and no download. |
| REQ-EXP-008 | The service settings (REQ-INF-001) are never part of the export. |
