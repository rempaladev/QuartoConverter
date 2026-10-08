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
    return {
      htmlPath: null,
      warning: `Quarto render failed, showing raw markdown instead: ${message}`,
    };
  }

  const parsed = path.parse(qmdPath);
  const htmlPath = path.join(parsed.dir, `${parsed.name}.html`);
  return { htmlPath };
}
