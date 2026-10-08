import { marked } from "marked";
import katex from "katex";
import { readFileSync } from "fs";
import path from "path";

// Inlined once at module load so each call doesn't re-read disk.
const katexCss = readFileSync(
  path.join(process.cwd(), "node_modules/katex/dist/katex.min.css"),
  "utf-8"
);

const PLACEHOLDER = "ZZZMATH";
const PLACEHOLDER_RE = new RegExp(`${PLACEHOLDER}(\\d+)END`, "g");

export function buildPreviewHtml(qmdText: string): string {
  // Strip YAML frontmatter block.
  const body = qmdText.replace(/^---[\s\S]*?---\n?/, "").trim();

  // Extract math regions before marked touches them — marked would mangle
  // _ and ^ inside equations (treating them as italic / unused markdown).
  const regions: Array<{ display: boolean; src: string }> = [];

  const guarded = body
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, src: string) => {
      regions.push({ display: true, src });
      return `${PLACEHOLDER}${regions.length - 1}END`;
    })
    .replace(/\$([^\n$]+?)\$/g, (_, src: string) => {
      regions.push({ display: false, src });
      return `${PLACEHOLDER}${regions.length - 1}END`;
    });

  let html = marked.parse(guarded) as string;

  // Restore each region as a KaTeX-rendered HTML string.
  html = html.replace(PLACEHOLDER_RE, (_, i) => {
    const { display, src } = regions[Number(i)];
    return katex.renderToString(src, { displayMode: display, throwOnError: false });
  });

  return wrapHtml(html);
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${katexCss}
body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1.5rem;line-height:1.7;color:#1a1a1a}
h1,h2,h3,h4{margin-top:1.5em;margin-bottom:.4em}
p{margin:.7em 0}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid #ccc;padding:.4rem .7rem;text-align:left}
th{background:#f0f0f0}
code{font-family:monospace;font-size:.9em;background:#f5f5f5;padding:.1em .3em;border-radius:3px}
pre{background:#f5f5f5;padding:1rem;border-radius:4px;overflow-x:auto}
pre code{background:none;padding:0}
blockquote{border-left:3px solid #ccc;margin:0;padding-left:1rem;color:#555}
.katex-display{overflow-x:auto;padding:.25em 0}
@media(prefers-color-scheme:dark){
  body{background:#1a1a1a;color:#e0e0e0}
  th{background:#2a2a2a}
  th,td{border-color:#444}
  code,pre{background:#2a2a2a}
  blockquote{border-color:#555;color:#aaa}
}
</style>
</head>
<body>${body}</body>
</html>`;
}
