"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./ResizablePanel.module.css";

interface ResizablePanelProps {
  children: React.ReactNode;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

const STEP = 24;

export default function ResizablePanel({
  children,
  initialHeight = 600,
  minHeight = 240,
  maxHeight = 2000,
}: ResizablePanelProps) {
  const [height, setHeight] = useState(initialHeight);
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);

  const clamp = useCallback(
    (value: number) => Math.min(maxHeight, Math.max(minHeight, value)),
    [minHeight, maxHeight]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { startY: e.clientY, startHeight: height };
    },
    [height]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      const delta = e.clientY - drag.current.startY;
      setHeight(clamp(drag.current.startHeight + delta));
    },
    [clamp]
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHeight((h) => clamp(h - STEP));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHeight((h) => clamp(h + STEP));
      }
    },
    [clamp]
  );

  return (
    <div className={styles.wrap} style={{ height }}>
      <div className={styles.content}>{children}</div>
      <div
        className={styles.handle}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize preview height"
        aria-valuenow={height}
        aria-valuemin={minHeight}
        aria-valuemax={maxHeight}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
