export interface SectionStyle {
  label: string;
  shortLabel: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const CANONICAL_SECTIONS = [
  "CSE AIML",
  "CSE AIDE",
  "CSE GEN AI",
  "CSE CSBS",
  "CSE GENERAL",
] as const;

export type CanonicalSection = (typeof CANONICAL_SECTIONS)[number];

const SECTION_STYLE_MAP: Record<string, SectionStyle> = {
  "CSE AIML": {
    label: "CSE AIML",
    shortLabel: "AIML",
    bg: "var(--sec-aiml-bg)",
    border: "var(--sec-aiml-border)",
    text: "var(--sec-aiml-text)",
    dot: "var(--sec-aiml-dot)",
  },
  "CSE AIDE": {
    label: "CSE AIDE",
    shortLabel: "AIDE",
    bg: "var(--sec-aide-bg)",
    border: "var(--sec-aide-border)",
    text: "var(--sec-aide-text)",
    dot: "var(--sec-aide-dot)",
  },
  "CSE GEN AI": {
    label: "CSE GEN AI",
    shortLabel: "GEN AI",
    bg: "var(--sec-genai-bg)",
    border: "var(--sec-genai-border)",
    text: "var(--sec-genai-text)",
    dot: "var(--sec-genai-dot)",
  },
  "CSE CSBS": {
    label: "CSE CSBS",
    shortLabel: "CSBS",
    bg: "var(--sec-csbs-bg)",
    border: "var(--sec-csbs-border)",
    text: "var(--sec-csbs-text)",
    dot: "var(--sec-csbs-dot)",
  },
  "CSE GENERAL": {
    label: "CSE GENERAL",
    shortLabel: "GENERAL",
    bg: "var(--sec-general-bg)",
    border: "var(--sec-general-border)",
    text: "var(--sec-general-text)",
    dot: "var(--sec-general-dot)",
  },
};

const FALLBACK_PALETTES: Array<Omit<SectionStyle, "label" | "shortLabel">> = [
  SECTION_STYLE_MAP["CSE AIML"],
  SECTION_STYLE_MAP["CSE AIDE"],
  SECTION_STYLE_MAP["CSE GEN AI"],
  SECTION_STYLE_MAP["CSE CSBS"],
  SECTION_STYLE_MAP["CSE GENERAL"],
  {
    bg: "var(--sec-other-bg)",
    border: "var(--sec-other-border)",
    text: "var(--sec-other-text)",
    dot: "var(--sec-other-dot)",
  },
];

export function getSectionStyle(sectionName: string): SectionStyle {
  const normalized = sectionName.trim();
  const upper = normalized.toUpperCase();

  for (const [key, style] of Object.entries(SECTION_STYLE_MAP)) {
    if (key.toUpperCase() === upper) {
      return style;
    }
  }

  // Deterministic accessible palette fallback for custom uploaded CSV sections
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = (hash * 31 + upper.charCodeAt(i)) >>> 0;
  }
  const palette = FALLBACK_PALETTES[hash % FALLBACK_PALETTES.length];
  const shortLabel = normalized.replace(/^CSE\s+/i, "").slice(0, 10) || normalized;

  return {
    label: normalized,
    shortLabel,
    ...palette,
  };
}

