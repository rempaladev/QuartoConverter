import styles from "./QmdSource.module.css";

interface QmdSourceProps {
  text: string;
}

export default function QmdSource({ text }: QmdSourceProps) {
  const lines = text.split("\n");
  return (
    <pre className={styles.source}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            <span className={styles.lineNumber}>{i + 1}</span>
            <span className={styles.lineText}>{line.length ? line : " "}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}
