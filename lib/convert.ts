import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_OUTPUT_TOKENS = 8192;

const SYSTEM_PROMPT = `You convert a single PDF document into a Quarto .qmd file that reproduces \
the document as faithfully as possible. Follow these rules exactly:

1. Output ONLY the raw .qmd file content. No commentary, no explanation, no \
   wrapping markdown code fence around the whole file.
2. Start with a YAML frontmatter block:
   ---
   title: "<the document's title, inferred from the PDF>"
   format: html
   ---
   Include "author:" and "date:" fields only if those are genuinely present in \
   the source document.
3. Preserve the document's structure: heading levels (#, ##, ###, ...), \
   paragraphs, ordered/unordered lists, tables (as Markdown tables), block \
   quotes, and code blocks (fenced with the correct language if identifiable).
4. Preserve ALL mathematical notation faithfully using LaTeX:
   - Inline math: $...$
   - Display/block equations: $$...$$ on their own lines
   - Use proper LaTeX commands for fractions (\\frac), integrals (\\int), \
     summations (\\sum), Greek letters (\\alpha, \\beta, ...), subscripts/\
     superscripts (_, ^), matrices (\\begin{bmatrix}...\\end{bmatrix}), etc.
   - Never approximate math with plain Unicode symbols when LaTeX is more \
     faithful to the original notation.
5. For figures/images you cannot reproduce, insert a short italicized \
   placeholder describing the figure (e.g., *Figure: diagram of ...*) rather \
   than omitting it silently.
6. Do not invent content that is not present in the source PDF.`;

export async function convertPdfToQmd(pdfPath: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });
  const pdfBytes = await readFile(pdfPath);
  const base64 = pdfBytes.toString("base64");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Convert this PDF into a .qmd file following the system instructions.",
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model did not return any text content.");
  }
  return stripStrayCodeFence(textBlock.text);
}

// Models occasionally wrap the whole file in a ```qmd ... ``` fence despite
// being told not to; strip it defensively rather than shipping it to Quarto.
function stripStrayCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
