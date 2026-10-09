import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob } from "@/lib/jobs";
import { convertPdfToQmd } from "@/lib/convert";
import { logger } from "@/lib/logger";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const event: Record<string, unknown> = {
    request_id: randomUUID(),
    method: "POST",
    path: "/api/convert",
  };

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      event.status_code = 400;
      event.outcome = "error";
      event.error = { message: "No file uploaded." };
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    event.file_name = file.name;
    event.file_size_bytes = file.size;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      event.status_code = 400;
      event.outcome = "error";
      event.error = { message: "Only PDF files are supported." };
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      event.status_code = 400;
      event.outcome = "error";
      event.error = { message: "File too large." };
      return NextResponse.json(
        { error: `File is too large (max ${MAX_BYTES / (1024 * 1024)} MB).` },
        { status: 400 }
      );
    }

    const job = await createJob();
    event.job_id = job.id;

    const pdfPath = path.join(job.dir, "input.pdf");
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(pdfPath, bytes);
    updateJob(job.id, { pdfPath, stage: "extracting" });

    // Run the pipeline in the background; the client polls /status for progress.
    void runPipeline(job.id, pdfPath);

    event.status_code = 200;
    event.outcome = "success";
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    event.status_code = 500;
    event.outcome = "error";
    event.error = { message };
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  } finally {
    event.duration_ms = Date.now() - startedAt;
    if (event.outcome === "error") {
      logger.error(event);
    } else {
      logger.info(event);
    }
  }
}

async function runPipeline(jobId: string, pdfPath: string) {
  const startedAt = Date.now();
  const event: Record<string, unknown> = {
    job_id: jobId,
    stage: "pipeline",
  };

  try {
    updateJob(jobId, { stage: "converting" });
    const { qmdText, inputTokens, outputTokens } = await convertPdfToQmd(pdfPath);
    event.input_tokens = inputTokens;
    event.output_tokens = outputTokens;
    event.qmd_length = qmdText.length;

    const qmdPath = path.join(path.dirname(pdfPath), "output.qmd");
    await writeFile(qmdPath, qmdText, "utf-8");
    updateJob(jobId, { stage: "done", qmdPath, qmdText });

    event.outcome = "success";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { stage: "error", error: message });
    event.outcome = "error";
    event.error = { message };
  } finally {
    event.duration_ms = Date.now() - startedAt;
    if (event.outcome === "error") {
      logger.error(event);
    } else {
      logger.info(event);
    }
  }
}
