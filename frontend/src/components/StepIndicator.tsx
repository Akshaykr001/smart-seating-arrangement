"use client";

export type WizardStep = 1 | 2 | 3;

interface StepIndicatorProps {
  currentStep: WizardStep;
  canNavigateToStep?: (step: WizardStep) => boolean;
  onSelectStep?: (step: WizardStep) => void;
}

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: "Students" },
  { step: 2, label: "Hall" },
  { step: 3, label: "Seating plan" },
];

export function StepIndicator({
  currentStep,
  canNavigateToStep,
  onSelectStep,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Seating plan progress" className="no-print">
      <ol
        role="list"
        className="surface-card inline-flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5"
      >
        {STEPS.map((item, idx) => {
          const isActive = item.step === currentStep;
          const isCompleted = item.step < currentStep;
          const isClickable =
            !isActive &&
            Boolean(onSelectStep) &&
            (canNavigateToStep ? canNavigateToStep(item.step) : isCompleted);

          const stepContent = (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-6 h-6 inline-flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  borderRadius: "var(--radius)",
                  backgroundColor: isActive
                    ? "var(--color-accent)"
                    : isCompleted
                    ? "var(--color-accent-subtle)"
                    : "var(--color-surface-subtle)",
                  color: isActive
                    ? "#FFFFFF"
                    : isCompleted
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                  border: isCompleted
                    ? "1px solid var(--color-accent-border)"
                    : isActive
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                }}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  item.step
                )}
              </span>
              <span
                className={`text-base ${
                  isActive
                    ? "font-semibold text-[var(--color-accent)]"
                    : isCompleted
                    ? "font-medium text-[var(--color-text)]"
                    : "font-normal text-[var(--color-text-muted)]"
                }`}
              >
                {item.label}
              </span>
            </span>
          );

          return (
            <li key={item.step} className="inline-flex items-center gap-2 sm:gap-3">
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onSelectStep?.(item.step)}
                  className="px-1.5 py-0.5 hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {stepContent}
                </button>
              ) : (
                <span
                  aria-current={isActive ? "step" : undefined}
                  className="px-1.5 py-0.5"
                >
                  {stepContent}
                </span>
              )}

              {idx < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="text-[var(--color-text-muted)] select-none px-0.5"
                >
                  &middot;
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

