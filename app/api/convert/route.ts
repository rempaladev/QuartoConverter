import { writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob } from "@/lib/jobs";
import { convertPdfToQmd } from "@/lib/convert";
import { renderQmdToHtml } from "@/lib/render";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (max ${MAX_BYTES / (1024 * 1024)} MB).` },
      { status: 400 }
    );
  }

  const job = await createJob();
  const pdfPath = path.join(job.dir, "input.pdf");
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(pdfPath, bytes);
  updateJob(job.id, { pdfPath, stage: "extracting" });

  // Run the pipeline in the background; the client polls /status for progress.
  void runPipeline(job.id, pdfPath);

  return NextResponse.json({ jobId: job.id });
}

async function runPipeline(jobId: string, pdfPath: string) {
  try {
    updateJob(jobId, { stage: "converting" });
    const qmdText = await convertPdfToQmd(pdfPath);

    const qmdPath = path.join(path.dirname(pdfPath), "output.qmd");
    await writeFile(qmdPath, qmdText, "utf-8");
    updateJob(jobId, { stage: "rendering", qmdPath, qmdText });

    const { htmlPath, warning } = await renderQmdToHtml(qmdPath);
    updateJob(jobId, {
      stage: "done",
      htmlPath: htmlPath ?? undefined,
      renderWarning: warning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { stage: "error", error: message });
  }
}
