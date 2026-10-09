import { describe, it, expect, afterEach } from "vitest";
import { existsSync } from "fs";
import { createJob, getJob, updateJob, deleteJob } from "./jobs";

describe("jobs", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await deleteJob(id);
    }
  });

  it("creates a job with an uploading stage and a real temp dir", async () => {
    const job = await createJob();
    createdIds.push(job.id);

    expect(job.stage).toBe("uploading");
    expect(existsSync(job.dir)).toBe(true);
    expect(getJob(job.id)).toEqual(job);
  });

  it("updates job fields in place", async () => {
    const job = await createJob();
    createdIds.push(job.id);

    updateJob(job.id, { stage: "converting", qmdText: "hello" });

    const updated = getJob(job.id);
    expect(updated?.stage).toBe("converting");
    expect(updated?.qmdText).toBe("hello");
  });

  it("returns undefined for an unknown job id", () => {
    expect(getJob("does-not-exist")).toBeUndefined();
  });

  it("deleteJob removes the job and its temp dir", async () => {
    const job = await createJob();

    expect(existsSync(job.dir)).toBe(true);

    await deleteJob(job.id);

    expect(getJob(job.id)).toBeUndefined();
    expect(existsSync(job.dir)).toBe(false);
  });
});
