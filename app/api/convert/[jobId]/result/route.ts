import { randomUUID } from "crypto";
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
    path: "/api/convert/[jobId]/result",
    job_id: jobId,
  };

  try {
    const job = getJob(jobId);
    if (!job) {
      event.status_code = 404;
      event.outcome = "error";
      event.error = { message: "Job not found." };
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.stage !== "done") {
      event.status_code = 409;
      event.outcome = "error";
      event.error = { message: "Job is not finished yet." };
      return NextResponse.json({ error: "Job is not finished yet." }, { status: 409 });
    }

    const qmdText = job.qmdText ?? "";
    event.qmd_length = qmdText.length;
    event.status_code = 200;
    event.outcome = "success";
    return NextResponse.json({ qmdText });
  } finally {
    event.duration_ms = Date.now() - startedAt;
    if (event.outcome === "error") {
      logger.error(event);
    } else {
      logger.info(event);
    }
  }
}
