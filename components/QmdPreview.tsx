import styles from "./QmdPreview.module.css";
import QmdSource from "./QmdSource";

interface QmdPreviewProps {
  html: string | null;
  warning?: string;
  fallbackText: string;
}

export default function QmdPreview({ html, warning, fallbackText }: QmdPreviewProps) {
  return (
    <div className={styles.wrap}>
      {warning && <p className={styles.warning}>{warning}</p>}
      {html ? (
        <iframe
          className={styles.frame}
          srcDoc={html}
          sandbox="allow-same-origin"
          title="Quarto rendered preview"
        />
      ) : (
        <QmdSource text={fallbackText} />
      )}
    </div>
  );
}
