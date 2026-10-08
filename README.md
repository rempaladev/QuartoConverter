# PDF → Quarto Converter

Converts an uploaded PDF into a Quarto `.qmd` file via the Claude API, with
side-by-side PDF/QMD viewing and a rendered Quarto preview. Local-only MVP,
no data persistence.

## Prerequisites

- Node.js 18+ and npm
- [Quarto CLI](https://quarto.org) installed and on your `PATH` (used to
  render the `.qmd` preview) — verify with `quarto --version`
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and set:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`ANTHROPIC_MODEL` is optional and defaults to `claude-sonnet-5-5`.

If the API returns a 400 error saying the key "is not scoped to a
workspace", find your workspace ID in the Anthropic Console and set it too:

```
ANTHROPIC_WORKSPACE_ID=wrkspc_...
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Drop in or choose a PDF (max 20 MB).
2. Watch the progress stages (Uploading → Extracting → Converting →
   Rendering → Done).
3. Switch between the **PDF**, **QMD Source**, **QMD Preview**, and
   **Side by side** tabs.
4. Click **Download .qmd** to save the generated file.

Nothing is persisted — job state and temp files live in memory/temp
directories and are discarded after ~30 minutes or on restart.

## Other scripts

```bash
npm run build      # production build
npm run start       # run the production build
npm run typecheck   # TypeScript check only
```

## Notes

- If `quarto render` fails on the model's output, the preview falls back to
  the raw `.qmd` text instead of erroring out.
- The PDF is sent to Claude natively (not pre-extracted as text) so layout,
  tables, and math come through with better fidelity.
