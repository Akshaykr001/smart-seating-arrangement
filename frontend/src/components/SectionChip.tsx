import { getSectionStyle } from "@/lib/sections";

interface SectionChipProps {
  section: string;
  count?: number;
  compact?: boolean;
}

export function SectionChip({ section, count, compact = false }: SectionChipProps) {
  const style = getSectionStyle(section);

  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        borderRadius: "var(--radius)",
        padding: compact ? "0.125rem 0.5rem" : "0.25rem 0.625rem",
        fontSize: compact ? "0.8125rem" : "0.875rem",
        lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "2px",
          backgroundColor: style.dot,
          flexShrink: 0,
        }}
      />
      <span>{compact ? style.shortLabel : style.label}</span>
      {typeof count === "number" && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>&middot; {count}</span>
      )}
    </span>
  );
}

