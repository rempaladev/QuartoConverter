import styles from "./ViewTabs.module.css";

export interface TabOption<T extends string> {
  key: T;
  label: string;
  disabled?: boolean;
}

interface ViewTabsProps<T extends string> {
  options: TabOption<T>[];
  active: T;
  onChange: (key: T) => void;
  size?: "default" | "small";
}

export default function ViewTabs<T extends string>({
  options,
  active,
  onChange,
  size = "default",
}: ViewTabsProps<T>) {
  return (
    <div className={`${styles.tabs} ${size === "small" ? styles.small : ""}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={active === opt.key}
          disabled={opt.disabled}
          className={`${styles.tab} ${active === opt.key ? styles.active : ""}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
