# PWA & Interaction Architecture
- **Smart Install Banner**: Custom-built universal install banner injected directly into `index.html`. It intercepts `beforeinstallprompt` on Android/Chrome, and falls back to explicit "Share" instructions on iOS Safari.
- **Service Worker Cache**: Updates require rigorous cache purging. Always remind the user to clear their cache or use Incognito when pushing manifest or UI updates.
