import { randomUUID } from "crypto";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import type { JobStage } from "@/lib/types";

export interface Job {
  id: string;
  stage: JobStage;
  error?: string;
  dir: string;
  pdfPath?: string;
  qmdPath?: string;
  qmdText?: string;
  htmlPath?: string;
  renderWarning?: string;
  createdAt: number;
}

// Next.js dev mode reloads route modules on every request, which would wipe
// a plain module-level Map. Stashing it on `globalThis` survives HMR.
const globalForJobs = globalThis as unknown as { __pdfQmdJobs?: Map<string, Job> };
const jobs = globalForJobs.__pdfQmdJobs ?? new Map<string, Job>();
globalForJobs.__pdfQmdJobs = jobs;

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function createJob(): Promise<Job> {
  const id = randomUUID();
  const dir = await mkdtemp(path.join(os.tmpdir(), "pdf-qmd-"));
  const job: Job = { id, stage: "uploading", dir, createdAt: Date.now() };
  jobs.set(id, job);
  scheduleCleanup(id);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
}

function scheduleCleanup(id: string) {
  const timer = setTimeout(() => {
    void deleteJob(id);
  }, JOB_TTL_MS);
  // Don't let the cleanup timer keep the dev/prod process alive on its own.
  timer.unref?.();
}

export async function deleteJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  await rm(job.dir, { recursive: true, force: true }).catch(() => {});
}
