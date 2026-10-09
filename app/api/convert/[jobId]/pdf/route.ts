import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const startedAt = Date.now();
  const { jobId } = await params;
  const event: Record<string, unknown> = {
    request_id: randomUUID(),
    method: "GET",
    path: "/api/convert/[jobId]/pdf",
    job_id: jobId,
  };

  try {
    const job = getJob(jobId);
    if (!job || !job.pdfPath) {
      event.status_code = 404;
      event.outcome = "error";
      event.error = { message: "Job not found." };
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const bytes = await readFile(job.pdfPath);
    event.bytes_served = bytes.length;
    event.status_code = 200;
    event.outcome = "success";
    return new NextResponse(bytes, {
      headers: { "Content-Type": "application/pdf" },
    });
  } finally {
    event.duration_ms = Date.now() - startedAt;
    if (event.outcome === "error") {
      logger.error(event);
    } else {
      logger.info(event);
    }
  }
}
