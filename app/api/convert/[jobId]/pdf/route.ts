import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job || !job.pdfPath) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const bytes = await readFile(job.pdfPath);
  return new NextResponse(bytes, {
    headers: { "Content-Type": "application/pdf" },
  });
}
