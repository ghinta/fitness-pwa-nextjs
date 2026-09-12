# Fitness PWA · Next.js

Eigenständige Next.js-Neuimplementierung der offline-first HIT-Trainingsapp.
Die Anwendung läuft vollständig im Browser, speichert ihre Daten in IndexedDB und
wird als statischer Export auf GitHub Pages veröffentlicht.

## Funktionsumfang

- Konfigurierbare Trainingspläne A/B mit sechs Übungsplätzen
- Übungsauswahl direkt im Training
- Persistierte Aufwärm- und Arbeitssatz-Timer
- Gewichts- und Dauerverlauf mit unverbindlicher Empfehlung
- Lokale Übungsbilder mit Kamera- und Mediathek-Import
- Unterbrochene Trainings fortsetzen
- Vollständiger JSON-Export und validierter Import
- Installierbare, offline-fähige PWA mit kontrollierten Updates

## Tech-Stack

- Next.js 16 App Router und React 19
- TypeScript im Strict Mode
- Tailwind CSS 4
- Dexie / IndexedDB
- React Hook Form
- Serwist Service Worker
- Vitest und Playwright Mobile WebKit

## Entwicklung

Node.js 24 und npm werden vorausgesetzt.

```sh
npm ci
npm run dev
```

Die Anwendung läuft lokal unter
`http://localhost:3000/fitness-pwa-nextjs/`.

## Prüfung

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

`npm run build` erzeugt den statischen GitHub-Pages-Export in `out/`.
Pushes auf `main` veröffentlichen diesen Ordner über GitHub Actions.

## Datenschutz

Es gibt kein Konto, Backend, Tracking oder externe API. Trainingsdaten und Bilder
bleiben im IndexedDB-Speicher des jeweiligen Browsers. JSON-Sicherungen sind nicht
verschlüsselt und sollten entsprechend sicher aufbewahrt werden.

Siehe [Produktdefinition](docs/PRODUCT.md),
[Architektur](docs/ARCHITECTURE.md), [Datenmodell](docs/DATA_MODEL.md) und
[Sicherheit](docs/SECURITY.md).
