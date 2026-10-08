"use client";

import { useRef, useState } from "react";
import styles from "./UploadArea.module.css";

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadArea({ onFileSelected, disabled }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${
        disabled ? styles.disabled : ""
      }`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className={styles.hiddenInput}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className={styles.title}>Drop a PDF here or tap to choose a file</p>
      <p className={styles.hint}>Max 20 MB</p>
    </div>
  );
}
