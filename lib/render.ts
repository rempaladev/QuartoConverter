import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface RenderResult {
  htmlPath: string | null;
  warning?: string;
}

export async function renderQmdToHtml(qmdPath: string): Promise<RenderResult> {
  try {
    await execFileAsync(
      "quarto",
      ["render", qmdPath, "--to", "html", "--embed-resources", "--standalone"],
      { timeout: 60_000 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notInstalled = message.includes("ENOENT") || message.includes("not recognized") || message.includes("not found");
    return {
      htmlPath: null,
      warning: notInstalled
        ? "Quarto not found — showing browser-rendered preview."
        : `Quarto render failed — showing browser-rendered preview. Details: ${message}`,
    };
  }

  const parsed = path.parse(qmdPath);
  const htmlPath = path.join(parsed.dir, `${parsed.name}.html`);
  return { htmlPath };
}
