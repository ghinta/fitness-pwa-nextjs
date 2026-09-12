# ADR 0001: Next.js static PWA

## Status

Accepted

## Context

This repository is an independent implementation of the Fitness PWA intended to
explore a modern React and Next.js stack. The product remains local-only,
offline-first, and hosted under a GitHub Pages project path.

## Decision

Use the Next.js App Router, React client components for browser-backed features,
TypeScript, Tailwind CSS, Dexie, React Hook Form, and Serwist. Build with
`output: "export"`, `trailingSlash: true`, and base path `/fitness-pwa-nextjs`.
Do not introduce a runtime server, authentication, analytics, or cloud storage.

## Consequences

The UI gains React composition and file-system routing while domain and persistence
rules stay framework-independent. Server Actions, SSR, ISR, built-in image
optimization, and response-header configuration are unavailable in the static
deployment. Offline behavior and updates require an explicit service worker and
mobile release testing.
