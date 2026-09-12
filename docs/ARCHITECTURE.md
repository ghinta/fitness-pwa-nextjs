# Architecture

## Approach

The application is a static, client-side Next.js PWA for GitHub Pages. The App
Router provides four routes and the React component model. Domain rules, services,
and Dexie repositories remain independent from React and rendering.

```text
src/app/          routes, root layout, manifest, service worker
src/components/   application provider, navigation, shared UI
src/domain/       entities, seeds, validation, recommendation rules
src/services/     workout/configuration, image and backup use cases
src/storage/      Dexie schema, transactions and repositories
src/lib/          formatting and deployment constants
tests/e2e/        essential mobile WebKit journeys
```

## Runtime

The root client provider opens and seeds IndexedDB after hydration, creates the
application services, and exposes only those services plus refresh and navigation
guard state to React. Pages query through services and render loading, empty, error,
and success states. A persisted active session is the source of truth for workout
recovery and timers.

Routes are statically exported as `/`, `/training/`, `/history/`, and `/settings/`.
The build-time base path is `/fitness-pwa-nextjs`; `next/link` applies it to page
navigation, while manifest and service-worker URLs use the explicit deployment
scope.

## Offline and updates

Serwist precaches all route documents, framework chunks, styles, icons, and the
manifest. Its standard runtime strategies cover Next.js navigation payloads. The
worker does not claim clients or activate immediately. A waiting version is applied
only after explicit user action and never while a workout, running timer, or dirty
form could be interrupted.

## Data safety

Dexie enforces all multi-record changes transactionally. Import is size-limited and
fully validated before replacement. A complete backup is downloaded immediately
before a confirmed import. Storage failures are surfaced and never trigger an
automatic reset.

## Deployment

`next build --webpack` emits a fully static export to `out/`. The checked-in
`.nojekyll` marker preserves Next.js `_next` assets on GitHub Pages. The deployment
workflow verifies formatting, lint, types, and unit tests before uploading `out/`.
