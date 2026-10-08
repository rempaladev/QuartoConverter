import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_OUTPUT_TOKENS = 16384;

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
4. MATH — trust the visual rendering of the PDF page. The PDF text layer may \
   contain Unicode approximations (e.g. a raised ² for a superscript, or a \
   literal α) that are incomplete or wrong; read the typeset layout to produce \
   correct LaTeX instead.

   Delimiters:
   - Inline math: $...$
   - Display / block equations: $$...$$ on their own lines
   - Inside table cells: always use inline $...$ — never display $$...$$

   Core constructs:
   - Fractions: \\frac{a}{b}; use \\dfrac{a}{b} to force full-size display inline
   - Exponents and subscripts with more than one character require braces: \
     x^{-1}, x^{2n}, a_{ij}, x_{n+1}
   - Roots: \\sqrt{x}, \\sqrt[3]{x}
   - Derivatives: \\frac{dy}{dx}, f'(x), f''(x), \\frac{\\partial f}{\\partial x}
   - Integrals: \\int_a^b f(x)\\,dx (thin space \\, before dx); \\iint_D f\\,dA; \
     \\iiint; \\oint_C
   - Limits: \\lim_{x \\to \\infty} f(x)
   - Sums / products: \\sum_{n=1}^{\\infty} a_n, \\prod_{i=1}^{n} a_i

   Multi-line and structured math:
   - Aligned derivations: $$\\begin{aligned} a &= b \\\\ &= c \\end{aligned}$$
   - Matrices (round brackets): \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}
   - Matrices (square brackets): \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}
   - Systems of equations: \\begin{cases} x+y=1 \\\\ x-y=0 \\end{cases}

   Unicode → LaTeX (never copy these raw into math mode):
   - Greek lower: \\alpha \\beta \\gamma \\delta \\epsilon \\theta \\lambda \
     \\mu \\pi \\sigma \\phi \\chi \\psi \\omega
   - Greek upper: \\Delta \\Sigma \\Omega \\Gamma \\Phi \\Theta
   - Relations: \\leq \\geq \\neq \\approx \\equiv \\propto \\sim
   - Arithmetic: \\pm \\mp \\times \\div \\cdot
   - Arrows / logic: \\to \\implies \\iff \\mapsto \\neg \\land \\lor \
     \\therefore \\because
   - Sets: \\in \\notin \\cup \\cap \\emptyset \\subseteq \\subset \
     \\forall \\exists
   - Number sets (blackboard bold): \\mathbb{N} \\mathbb{Z} \\mathbb{Q} \
     \\mathbb{R} \\mathbb{C}
   - Calculus: \\partial \\nabla \\infty
   - Geometry: \\angle \\perp \\parallel
   - Combinatorics: "n choose k" → \\binom{n}{k}; modular → \\pmod{n}
   - Probability: P(A given B) → P(A \\mid B)
   - Vectors: \\vec{v}, \\hat{u}, \\lvert \\vec{v} \\rvert

   Known-bad macros (break Quarto's Typst renderer — use the replacement):
   - \\dbinom{n}{k} → \\binom{n}{k}

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
