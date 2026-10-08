import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job || !job.qmdPath) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const content = await readFile(job.qmdPath, "utf-8");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="output.qmd"',
    },
  });
}
