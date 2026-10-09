import { readFileSync } from "fs";
import os from "os";
import path from "path";

type WideEvent = Record<string, unknown>;

const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf-8")) as {
  version: string;
};

// Fields every wide event carries, regardless of which route emits it —
// lets us correlate issues with a deploy/host without each call site
// repeating this boilerplate.
const environment = {
  service: "pdf-to-qmd-converter",
  app_version: pkg.version,
  node_env: process.env.NODE_ENV ?? "development",
  hostname: os.hostname(),
  pid: process.pid,
  commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA,
  region: process.env.VERCEL_REGION,
};

function emit(level: "info" | "error", event: WideEvent) {
  const line = JSON.stringify({ level, timestamp: new Date().toISOString(), ...environment, ...event });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: WideEvent) => emit("info", event),
  error: (event: WideEvent) => emit("error", event),
};
