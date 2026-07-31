# Local Validation Guide

```bash
npm ci
npm run contract:check
npm run typecheck
npm run lint
npm test
npm run build
node scripts/browser-smoke.mjs
```

The browser Smoke script requires `chromium` on PATH or `CHROMIUM_PATH` pointing to a Chromium-compatible executable. It validates all 53 routes and regenerates screenshots under `evidence/screenshots/`.
