# 🎙️ EchoKiz – Datensammler & KI-Sprachbrücke

> **EchoKiz** ist eine Open-Source-Plattform zur Erfassung individueller Sprachdaten von Kindern mit Sprachbeeinträchtigungen (z. B. Dysarthrie, Dyslalie oder Apraxie) und zur Feinjustierung (Fine-Tuning) von KI-Sprachmodellen (z. B. OpenAI Whisper), um beeinträchtigte Sprache in verständliches Deutsch zu übersetzen.

---

## 💡 Vision & Problemstellung

Standard-Spracherkennungen (wie Siri, Google Voice oder unmodifizierte ASR-Modelle) scheitern bei Artikulationsabweichungen und individuellen Sprachmustern. Da jedes sprachbeeinträchtigte Kind einzigartige Artikulationsformen besitzt, ist ein **personalisierter Datenaufbau** der Schlüssel.

**EchoKiz schlägt die Brücke:**
1. **Datensammlung:** Eltern und Therapeuten nehmen strukturierte Audio-Proben (Wörter & Sätze) mit dem Kind auf.
2. **Dataset-Export:** Die App generiert ein standardisiertes, annotiertes Dataset (16-kHz-Mono-WAV + CSV/JSON).
3. **KI-Fine-Tuning:** Ein vortrainiertes ASR-Modell (*Whisper-small/medium*) wird per *Transfer Learning* (LoRA) auf die Stimme des Kindes adaptiert.
4. **Alltags-Übersetzer:** Die KI übersetzt die Sprache des Kindes in Echtzeit in klaren Text und Sprache (Text-to-Speech).

---

## ✨ Features des Datensammlers (`EchoKiz-App`)

* 🎙️ **In-Browser Audio-Aufnahme:** Direkt im Browser ohne Installation via Web Audio API (`AudioWorklet`). Die Aufnahmen werden direkt als **16-kHz-Mono-WAV** erzeugt – dem Format, das Whisper erwartet – und sind damit unabhängig vom Browser-Codec (WebM/Opus bzw. MP4/AAC bei `MediaRecorder`). Echo-, Rausch- und Pegelautomatik des Browsers sind bewusst deaktiviert, damit atypische Sprache nicht verfälscht wird.
* ✂️ **Automatische Aufbereitung & Qualitätsprüfung:** Stille am Anfang/Ende wird entfernt (mit 300 ms Puffer); zu kurze, zu leise oder übersteuerte Aufnahmen werden gemeldet.
* 📊 **Echtzeit-Audiovisualisierung:** Visualisierung der Mikrofon-Wellenform zur visuellen Kontrolle der Aufnahme.
* 📚 **Dynamischer Wortkatalog:** Vordefinierte Kernwörter, Alltagssätze und Laute mit Emojis (für Kinder, die noch nicht lesen) – erweiterbar um eigene Phrasen. Pro Phrase werden mehrere Wiederholungen gesammelt (Standard: 3).
* 🎯 **Intelligente Reihenfolge:** Standardmäßig zeigt „Weiter“ als Nächstes das Wort mit den **wenigsten Aufnahmen** des aktuellen Sprechers (bei Gleichstand in Katalogreihenfolge). Alternativ lässt sich die feste Katalogreihenfolge wählen; die Einstellung wird gemerkt.
* 🏆 **Kindgerechte Gamification:** Sterne-Belohnungen und visueller Jubel nach jeder gelungenen Aufnahme.
* 👨‍👩‍👧 **Erwachsenen-Prüfung:** Nach jeder Aufnahme: Anhören, Verwerfen, Notiz (z. B. „sagt *Wassa*“).
* 👤 **Multi-Sprecher & Session-Management:** Anonymisierte Sprecher-IDs mit Einwilligung (inkl. Zeitstempel) und automatische Sessions.
* 🛟 **Persistente lokale Speicherung:** Jede Aufnahme wird sofort in **IndexedDB** gespeichert und überlebt Reloads, Tab-Abstürze und Neustarts. Dauerhafter Speicher wird per `navigator.storage.persist()` angefragt.
* 💾 **Hugging Face / PyTorch Ready:** 1-Klick-Export als **ZIP** (`metadata.csv` + `audio/*.wav` + `echokiz-export.json`), direkt ladbar mit Hugging Face `datasets` (`audiofolder`).
* ⏰ **Backup-Erinnerung:** Hinweis, wenn länger als 7 Tage nicht exportiert wurde.
* 🗑️ **Widerruf & Löschung:** Alle Daten eines Sprechers lassen sich vollständig löschen.
* 🔒 **Privacy-First:** Alle Audiodaten verbleiben lokal auf dem Gerät des Anwenders, ohne Server und ohne Tracking.
* 🧩 **Austauschbare Speicherschicht:** Die UI greift nur über das Interface `EchoKizStorage` auf den Speicher zu; ein späteres Backend lässt sich ohne Umbau anbinden.

---

## 🧱 Tech-Stack

| Bereich | Technologie |
|---|---|
| UI | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) + TypeScript |
| Build & Dev-Server | [Vite](https://vite.dev/) |
| Zustand | [Pinia](https://pinia.vuejs.org/) |
| Routing | [Vue Router](https://router.vuejs.org/) (Hash-Modus, funktioniert auf GitHub Pages) |
| Audio | Web Audio API, `AudioWorklet`, eigener WAV-Encoder & Resampler |
| Speicher | IndexedDB (ohne Zusatzbibliothek) |
| ZIP-Export | [fflate](https://github.com/101arrowz/fflate) |
| Tests | [Vitest](https://vitest.dev/) + [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) |

Die App ist eine reine **Client-Anwendung (Single-Page-App)**: Der Build erzeugt statische Dateien, die im Browser laufen. Node.js wird nur zum Entwickeln und Bauen benötigt – zur Laufzeit gibt es keinen Server.

Die Logik in `src/core/` ist bewusst **framework-frei** (reines TypeScript) und separat testbar; Vue ist nur die Oberfläche.

---

## 🚀 Quickstart

Voraussetzung: [Node.js](https://nodejs.org/) in einer aktuellen LTS-Version (empfohlen: 24).

```bash
git clone https://github.com/dremonaut/echokiz.git
cd echokiz
npm install
npm run dev
```

Anschließend `http://localhost:5173` im Browser öffnen.

| Befehl | Beschreibung |
|---|---|
| `npm run dev` | Dev-Server mit Hot Reload |
| `npm test` | Unit-Tests (Vitest) |
| `npm run typecheck` | TypeScript-Prüfung (`vue-tsc`) |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen |

> **Hinweise**
> * Der Mikrofonzugriff funktioniert nur über `https://` oder `http://localhost`.
> * IndexedDB ist an die **Origin** gebunden (Protokoll + Domain + Port). `http://localhost:5173`, `http://localhost:4173` und die GitHub-Pages-Adresse haben jeweils eine **eigene** Datenbank. Für echte Aufnahmen immer dieselbe Adresse verwenden.
> * Im privaten Modus werden die Daten beim Schließen des Fensters gelöscht.

---

## 📱 Auf dem Handy aufnehmen

Handys erlauben das Mikrofon nur über **HTTPS**. Eine einfache `http://192.168.x.x`-Adresse im WLAN reicht daher nicht.

### Dauerhaft: GitHub Pages (empfohlen)

Der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) testet, baut und veröffentlicht die App bei jedem Push auf `main`.

1. Im Repository unter **Settings → Pages → Build and deployment → Source** „**GitHub Actions**“ auswählen.
2. Auf `main` pushen.
3. Die App ist danach unter `https://dremonaut.github.io/echokiz/` erreichbar.
4. Auf dem Handy öffnen und **zum Home-Bildschirm hinzufügen** (iOS: Teilen → „Zum Home-Bildschirm“). Das verringert das Risiko, dass Safari die Daten nach längerer Inaktivität löscht.

**Fehler „Get Pages site failed / Not Found“:** Unter **Settings → Pages** prüfen, ob Pages aktiviert und als Quelle **GitHub Actions** ausgewählt ist. Danach unter **Actions → Deploy to GitHub Pages → Run workflow** erneut starten. Bei privaten Repositories muss der GitHub-Tarif Pages für private Repositories unterstützen; ein privates Repository macht die veröffentlichte Website nicht automatisch privat. Pages wird vom Workflow bewusst nicht automatisch aktiviert.

Der Workflow verwendet Ubuntu 24.04 und Actions mit Node-24-Laufzeit. Diese Action-Laufzeit ist unabhängig von der Node-Version, die `setup-node` zum Bauen der App installiert.

Auf GitHub Pages liegt nur der Programmcode – die Aufnahmen verlassen das Handy nicht. Der ZIP-Export landet im Download-Ordner des Handys und kann von dort auf den PC übertragen werden.

### Zum Testen während der Entwicklung: Tunnel

```bash
npm run dev
cloudflared tunnel --url http://localhost:5173
```

Die ausgegebene `https://….trycloudflare.com`-Adresse auf dem Handy öffnen. Die Adresse ändert sich bei jedem Start (und damit auch die IndexedDB) – daher nur für Tests, nicht für echte Aufnahmen verwenden.

---

## 🗂️ Projektstruktur

```text
echokiz/
├── index.html
├── vite.config.ts
├── .github/workflows/deploy.yml   # Test, Build & Deployment auf GitHub Pages
└── src/
    ├── main.ts                    # App-Start (Vue, Pinia, Router)
    ├── App.vue                    # Layout & Navigation
    ├── router.ts
    ├── core/                      # Framework-freie Logik (TypeScript)
    │   ├── recorder.ts            # Mikrofon, AudioWorklet, Analyser
    │   ├── recorder-worklet.ts    # AudioWorkletProcessor (sammelt PCM-Samples)
    │   ├── resample.ts            # Resampling auf 16 kHz (windowed sinc)
    │   ├── wav.ts                 # WAV-Encoder/-Decoder (16 bit PCM)
    │   ├── quality.ts             # Qualitätsprüfung & Stille-Trimmung
    │   ├── storage.ts             # Speicher-Interface
    │   ├── storage-idb.ts         # IndexedDB-Implementierung
    │   ├── export.ts              # ZIP-Export, metadata.csv
    │   ├── catalog.ts             # Wortkatalog
    │   ├── priority.ts            # Auswahl des nächsten Wortes (wenig aufgenommen zuerst)
    │   ├── device.ts              # Speicherstatus, Wake Lock, Download
    │   └── *.test.ts              # Unit-Tests
    ├── stores/app.ts              # Pinia-Store (Sprecher, Session, Aufnahmen)
    ├── composables/               # Wiederverwendbare Vue-Logik (z. B. Wiedergabe)
    ├── components/                # UI-Bausteine (z. B. Wellenform)
    └── views/                     # Seiten: Sprecher, Aufnahme, Katalog, Daten
```

---

## 🗄️ Speicherung & Backup

### Lokale Speicherung mit IndexedDB

Aufnahmen werden **sofort nach dem Stoppen** in IndexedDB abgelegt (nicht erst beim Export). Ein Absturz kostet so höchstens die laufende Aufnahme.

```text
DB: echokiz (Version 1)
├── speakers    key: id          { id: "Kind_01", createdAt, consent: { given, timestamp } }
├── sessions    key: id          { id, speakerId, startedAt }                      # Index: speakerId
├── recordings  key: id (auto)   { speakerId, sessionId, phraseId, targetText, category, notes,
│                                  duration, sampleRate, timestamp, device, wav: ArrayBuffer }
│                                                                                  # Index: speakerId, sessionId
└── phrases     key: id          { id: "custom-…", text, category, emoji, custom }  # nur eigene Phrasen
```

Das Audio wird als `ArrayBuffer` (fertige WAV-Datei) gespeichert – das ist über alle Browser hinweg robuster als `Blob`. Schema-Änderungen erfolgen über `DB_VERSION` in [`src/core/storage-idb.ts`](src/core/storage-idb.ts) und `onupgradeneeded`.

### Grenzen & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Browser darf Daten bei Speicherknappheit löschen | `navigator.storage.persist()` wird angefragt, Verbrauch per `navigator.storage.estimate()` angezeigt |
| Safari kann Daten nach ca. 7 Tagen Inaktivität löschen (nicht bei Home-Bildschirm-App) | Regelmäßiger Export, Erinnerung in der App |
| Cache/Browserdaten leeren löscht alles | ZIP-Export als Backup |
| Andere Origin = andere Datenbank | Immer dieselbe Adresse nutzen, App gehostet bereitstellen |
| Privater Modus | Daten gehen beim Schließen verloren |

### Backup-Strategie

1. **Standard:** Lokal speichern (IndexedDB) + manueller ZIP-Export als Backup.
2. **Optional:** Backup in einen vom Nutzer gewählten Ordner (File System Access API, z. B. ein mit der eigenen Cloud synchronisierter Ordner). Kein OAuth und kein Drittanbieter-Code nötig.
3. **Nur bei Bedarf:** Eigenes Backend (idealerweise in der EU gehostet) mit Einwilligungsverwaltung, Verschlüsselung, Zugriffsrechten und Löschfunktion. Erst sinnvoll, wenn mehrere Familien/Therapeuten Daten teilen oder ein gemeinsames Modell trainiert wird.

Ein zentraler Server oder Cloud-Speicher (z. B. Google Drive) ist bewusst **nicht** Teil des MVP: Kindersprache mit Diagnosebezug fällt unter **DSGVO Art. 9** und würde Betreiberverantwortung (Einwilligung, AV-Vertrag, Löschkonzept) mit sich bringen.

---

## 📂 Datenstruktur & Exportformat

Der Export erzeugt ein ZIP im Hugging-Face-`audiofolder`-Layout. Die `metadata.csv` liegt neben dem Audio-Ordner, `file_name` ist **relativ zur `metadata.csv`**. Zusätzlich enthält das ZIP `echokiz-export.json` mit allen Metadaten inkl. Sprechern, Einwilligungen und Sessions (Grundlage für einen späteren Import).

```text
echokiz_Kind_01_2026-10-20.zip
├── metadata.csv
├── echokiz-export.json
└── audio/
    ├── 20261020_wasser_kind_01_1.wav
    └── 20261020_ich_moechte_wasser_kind_01_2.wav
```

### `metadata.csv` Schema
```csv
file_name,target_text,category,duration,speaker_id,session_id,timestamp,notes
"audio/20261020_wasser_kind_01_1.wav","Wasser","Kernwörter",1.85,"Kind_01","Kind_01_Session_01","2026-10-20T19:43:00.000Z","sagt ""Wassa"""
"audio/20261020_ich_moechte_wasser_kind_01_2.wav","Ich möchte Wasser","Sätze",3.1,"Kind_01","Kind_01_Session_01","2026-10-20T19:45:12.000Z",""
```

Alle Audiodateien sind **16 kHz, mono, 16 bit PCM**.

### Trainingsdaten lokal ablegen

Zum Training das ZIP z. B. nach `dataset/` entpacken. `dataset/`, `*.zip` und `*.wav` stehen in der `.gitignore`: Sprachaufnahmen von Kindern dürfen nicht versehentlich veröffentlicht werden.

Geplant ist zusätzlich ein Ordner `training/` mit Python-Skripten für das Fine-Tuning (siehe Roadmap).

---

## 🤖 KI Fine-Tuning Pipeline (Ausblick)

Das Training nutzt das vortrainierte `openai/whisper-small` (oder `whisper-medium`) Modell:

```python
# Beispielhafter Ladevorgang in PyTorch / Hugging Face
from datasets import load_dataset, Audio
from transformers import WhisperForConditionalGeneration, WhisperProcessor

# 1. Dataset laden (audiofolder liest metadata.csv und dekodiert das Audio)
dataset = load_dataset("audiofolder", data_dir="dataset")
dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))

# 2. Whisper Processor & Modell laden
processor = WhisperProcessor.from_pretrained("openai/whisper-small", language="German", task="transcribe")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")

# 3. Fine-Tuning durchführen (z. B. mit LoRA / PEFT), Zieltext: Spalte "target_text"
# ... (siehe training/train_whisper.py)
```

### Realistische Erwartungen

* **Datenmenge:** Ein fester Wortkatalog führt vor allem zu einem Modell, das diesen Katalog erkennt. Für freie Sprache sind deutlich mehr Daten nötig (grob einige Stunden pro Kind).
* **Halluzinationen:** Whisper kann bei unklarer Sprache plausibel klingende, aber falsche Texte erzeugen. Konfidenzwerte und eine Bestätigung durch Bezugspersonen sind sinnvoll.
* **Echtzeit:** Whisper ist kein natives Streaming-Modell. Realistisch ist eine Antwortzeit von ein bis zwei Sekunden, z. B. lokal mit `whisper.cpp` oder ONNX.
* **Alternative bei kleinem, festem Wortschatz:** Ein Klassifikator oder Few-Shot-Ansatz kann zuverlässiger sein als Whisper-Fine-Tuning.
* **Früh validieren:** Das Training zuerst mit einer kleinen Datenmenge testen, bevor in die Live-Inferenz investiert wird.

---

## 🔒 Datenschutz & Ethik

Da Sprachdaten von Kindern mit Sprachbeeinträchtigung besonders schützenswerte Gesundheitsdaten (DSGVO Art. 9) darstellen:
* Es werden **keine Audiodaten** ungefragt an externe Cloud-Server gesendet.
* Alle Daten verbleiben bis zum manuellen Export lokal im Browser (IndexedDB) auf dem Gerät.
* Sprecher-IDs sollten stets **anonymisiert** gewählt werden (z. B. `Kind_01`, `Kind_02`).
* Aufnahmen nur mit Einwilligung der Erziehungsberechtigten erstellen und weitergeben. Die App speichert die Einwilligung mit Zeitstempel pro Sprecher.
* Daten eines Sprechers müssen jederzeit vollständig **löschbar** sein.
* Wer Backups in eine Cloud legt, sollte das in der Einwilligung ausdrücklich erwähnen.

---

## 🛣️ Roadmap

- [x] **Phase 1:** Datensammler-MVP: 16-kHz-WAV-Aufnahme, Wortkatalog, Waveform, Gamification, **IndexedDB-Persistenz** (inkl. `storage.persist()`)
- [ ] **Phase 2:** Export & Backup
  - [x] ZIP-Export (`audiofolder`-Layout, CSV & JSON)
  - [x] Backup-Erinnerung
  - [x] Einwilligung & Löschfunktion
  - [ ] Import eines Exports (Wiederherstellung / Gerätewechsel)
- [ ] **Phase 3:** Python Fine-Tuning Skript mit LoRA-Unterstützung (zuerst mit kleiner Datenmenge validieren)
- [ ] **Phase 4:** Optionales Backup in einen vom Nutzer gewählten Ordner (File System Access API) und PWA/Offline-Installation (`vite-plugin-pwa`)
- [ ] **Phase 5:** Live-Inferenz App (lokaler Echtzeit-Übersetzer & TTS Vorlesefunktion)
- [ ] **Phase 6 (nur bei Bedarf):** Eigenes EU-Backend für geteilte Datensätze

---

## 🤝 Mitwirken & Lizenz

Beiträge, Feedback und Ideen von Eltern, Logopäden und Entwicklern sind herzlich willkommen!

Dieses Projekt steht unter der **MIT-Lizenz**.
