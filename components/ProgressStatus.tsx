import type { JobStage } from "@/lib/types";
import styles from "./ProgressStatus.module.css";

const STAGES: { key: JobStage; label: string }[] = [
  { key: "uploading", label: "Uploading" },
  { key: "extracting", label: "Extracting" },
  { key: "converting", label: "Converting" },
  { key: "done", label: "Done" },
];

interface ProgressStatusProps {
  stage: JobStage;
  error?: string;
}

export default function ProgressStatus({ stage, error }: ProgressStatusProps) {
  if (stage === "error") {
    return <p className={styles.error}>Conversion failed: {error ?? "Unknown error."}</p>;
  }

  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <ol className={styles.steps}>
      {STAGES.map((s, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
        return (
          <li key={s.key} className={`${styles.step} ${styles[state]}`}>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
