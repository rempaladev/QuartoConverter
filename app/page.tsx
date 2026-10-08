"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { JobStage } from "@/lib/types";
import UploadArea from "@/components/UploadArea";
import ProgressStatus from "@/components/ProgressStatus";
import ViewTabs, { TabOption } from "@/components/ViewTabs";
import QmdSource from "@/components/QmdSource";
import QmdPreview from "@/components/QmdPreview";
import ResizablePanel from "@/components/ResizablePanel";
import styles from "./page.module.css";

// react-pdf touches browser-only APIs at module scope; it must never run during SSR.
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });

type ViewMode = "pdf" | "source" | "preview" | "side";
type SideQmdMode = "source" | "preview";

interface ConvertResult {
  qmdText: string;
  html: string | null;
  renderWarning?: string;
}

const MAIN_TABS: TabOption<ViewMode>[] = [
  { key: "pdf", label: "PDF" },
  { key: "source", label: "QMD Source" },
  { key: "preview", label: "QMD Preview" },
  { key: "side", label: "Side by side" },
];

const SIDE_SUB_TABS: TabOption<SideQmdMode>[] = [
  { key: "source", label: "Source" },
  { key: "preview", label: "Preview" },
];

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [stage, setStage] = useState<JobStage | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [view, setView] = useState<ViewMode>("pdf");
  const [sideQmdMode, setSideQmdMode] = useState<SideQmdMode>("preview");

  const resultReady = stage === "done" && result !== null;

  useEffect(() => {
    if (!jobId || stage === "done" || stage === "error") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/convert/${jobId}/status`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStage("error");
          setError(body.error ?? "Status check failed.");
          return;
        }
        setStage(body.stage);
        setError(body.error);
      } catch (err) {
        if (!cancelled) {
          setStage("error");
          setError(err instanceof Error ? err.message : "Status check failed.");
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, stage]);

  // Separate from the polling effect above: fetching the result must not be
  // cancelled by the status-poll cleanup that fires the instant `stage`
  // flips to "done" (setStage schedules a re-render before this fetch
  // resolves, which would otherwise mark it cancelled and drop the result).
  useEffect(() => {
    if (!jobId || stage !== "done" || result) return;

    let cancelled = false;
    (async () => {
      try {
        const resultRes = await fetch(`/api/convert/${jobId}/result`);
        const resultBody = await resultRes.json();
        if (!cancelled && resultRes.ok) {
          setResult(resultBody);
          setView("side");
        }
      } catch {
        // Stage already shows "done"; leave result panels empty on failure.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, stage, result]);

  async function handleFile(file: File) {
    setError(undefined);
    setResult(null);
    setJobId(null);
    setStage(null);
    setView("pdf");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/convert", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      setJobId(body.jobId);
      setStage("uploading");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function reset() {
    setJobId(null);
    setStage(null);
    setError(undefined);
    setResult(null);
    setView("pdf");
  }

  const pdfUrl = jobId ? `/api/convert/${jobId}/pdf` : null;
  const tabsWithState = MAIN_TABS.map((tab) => ({
    ...tab,
    disabled: tab.key !== "pdf" && !resultReady,
  }));

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>PDF &rarr; Quarto Converter</h1>
        {jobId && (
          <button type="button" className={styles.resetButton} onClick={reset}>
            Convert another PDF
          </button>
        )}
      </header>

      {!jobId && <UploadArea onFileSelected={handleFile} />}

      {jobId && stage && (
        <div className={styles.workspace}>
          <ProgressStatus stage={stage} error={error} />

          <div className={styles.toolbar}>
            <ViewTabs options={tabsWithState} active={view} onChange={setView} />
            {resultReady && view === "side" && (
              <ViewTabs
                options={SIDE_SUB_TABS}
                active={sideQmdMode}
                onChange={setSideQmdMode}
                size="small"
              />
            )}
            {resultReady && (
              <a className={styles.downloadButton} href={`/api/convert/${jobId}/download`}>
                Download .qmd
              </a>
            )}
          </div>

          <div className={styles.panels}>
            {view === "pdf" && pdfUrl && (
              <div className={styles.panel}>
                <PdfViewer fileUrl={pdfUrl} />
              </div>
            )}

            {view === "source" && resultReady && (
              <div className={styles.panel}>
                <QmdSource text={result.qmdText} />
              </div>
            )}

            {view === "preview" && resultReady && (
              <ResizablePanel>
                <QmdPreview
                  html={result.html}
                  warning={result.renderWarning}
                  fallbackText={result.qmdText}
                />
              </ResizablePanel>
            )}

            {view === "side" && resultReady && pdfUrl && (
              <div className={styles.sideBySide}>
                <div className={styles.panel}>
                  <PdfViewer fileUrl={pdfUrl} />
                </div>
                <div className={styles.panel}>
                  {sideQmdMode === "source" ? (
                    <QmdSource text={result.qmdText} />
                  ) : (
                    <QmdPreview
                      html={result.html}
                      warning={result.renderWarning}
                      fallbackText={result.qmdText}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
