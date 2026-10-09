import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  if (job.stage !== "done") {
    return NextResponse.json({ error: "Job is not finished yet." }, { status: 409 });
  }

  return NextResponse.json({ qmdText: job.qmdText ?? "" });
}