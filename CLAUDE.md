# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm run typecheck  # Run TypeScript compiler check (no emit)
```

No test suite is configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY`. The model defaults to `claude-sonnet-5-5` and can be overridden with `ANTHROPIC_MODEL`. Set `ANTHROPIC_WORKSPACE_ID` only if the API returns a 400 error requesting it.

Quarto must be installed and available on `PATH` for the render step (`quarto render`). If Quarto is missing, the app degrades gracefully — the `.qmd` source is still produced and shown, but the HTML preview tab is replaced with a warning.

## Architecture

This is a Next.js 16 app (see `AGENTS.md` — read `node_modules/next/dist/docs/` before writing Next.js code).

**Conversion pipeline** (server-side, triggered by `POST /api/convert`):

1. Upload: PDF written to a temp dir (`os.tmpdir()`), job record created in-memory.
2. Convert (`lib/convert.ts`): PDF bytes sent to Claude API as a base64 `document` block; the model returns `.qmd` text.
3. Render (`lib/render.ts`): `quarto render --to html --embed-resources --standalone` is called via `execFile`; failures are non-fatal.
4. Client polls `GET /api/convert/[jobId]/status` until `stage` is `"done"` or `"error"`.

**Job store** (`lib/jobs.ts`): an in-memory `Map` stashed on `globalThis` to survive Next.js HMR module reloads. Jobs auto-delete after 30 minutes. There is no database or persistent storage.

**API routes under `app/api/convert/`**:
- `POST /api/convert` — upload + kick off background pipeline, returns `{ jobId }`
- `GET /api/convert/[jobId]/status` — poll for `stage`, `error`, `renderWarning`
- `GET /api/convert/[jobId]/result` — returns raw `.qmd` text
- `GET /api/convert/[jobId]/download` — triggers `.qmd` file download
- `GET /api/convert/[jobId]/pdf` — streams the original PDF bytes (used by the PDF viewer component)

**Frontend** (`app/page.tsx` + `components/`): single-page React UI. After upload completes, shows a tabbed workspace with `ViewTabs` controlling which panel is visible: PDF viewer (`PdfViewer` uses `react-pdf`), raw `.qmd` source (`QmdSource`), and rendered HTML preview (`QmdPreview` renders in an `<iframe>`).

**Styling**: CSS Modules per component; design tokens (colors, radius, etc.) defined as CSS custom properties in `app/globals.css`.
