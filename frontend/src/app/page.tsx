"use client";

import { useState } from "react";
import { StepIndicator, WizardStep } from "@/components/StepIndicator";
import { SectionChip } from "@/components/SectionChip";
import { CANONICAL_SECTIONS } from "@/lib/sections";
import { useToast } from "@/components/ToastProvider";

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [sampleHallName, setSampleHallName] = useState("Main Examination Block — Hall A");
  const { showToast } = useToast();

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Page Intro & Step Indicator */}
      <div className="space-y-6">
        <div className="space-y-2 max-w-2xl">
          <h1
            id="main-content"
            tabIndex={-1}
            className="text-3xl sm:text-4xl font-serif text-[var(--color-text)]"
          >
            Exam seating plans, ready in seconds
          </h1>
          <p className="text-lg text-[var(--color-text-muted)]">
            Upload your students, pick a hall, and get a conflict-free exam seating plan in seconds.
          </p>
        </div>

        <StepIndicator
          currentStep={currentStep}
          canNavigateToStep={(step) => step <= currentStep}
          onSelectStep={setCurrentStep}
        />
      </div>

      {/* Main Step Workspace Shell (Step 1 of build order: Design System & Shell Foundation) */}
      <section aria-labelledby="workspace-heading" className="surface-card p-6 sm:p-8 space-y-8">
        <div className="border-b border-[var(--color-border)] pb-6 space-y-2">
          <div className="text-sm font-semibold text-[var(--color-accent)]">
            Step 1 of 3 &middot; Students
          </div>
          <h2 id="workspace-heading" className="text-2xl font-serif">
            Choose a student roster to begin
          </h2>
          <p className="text-base text-[var(--color-text-muted)] max-w-2xl">
            Page shell and design system foundation: warm off-white canvas, flat 1px cards, Lora serif headings paired with 16px Inter UI copy, accessible section chips, and a single deep forest green accent.
          </p>
        </div>

        {/* Section Chips Palette */}
        <div className="space-y-3">
          <h3 className="text-lg font-serif">Section chips</h3>
          <div className="flex flex-wrap gap-2.5">
            {CANONICAL_SECTIONS.map((sec) => (
              <SectionChip key={sec} section={sec} count={12} />
            ))}
          </div>
        </div>

        {/* Status Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="status-banner status-banner-success flex items-start gap-3">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 shrink-0"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <strong className="font-semibold">All constraints satisfied</strong> &mdash; no two students from the same section sit next to each other.
            </div>
          </div>

          <div className="status-banner status-banner-warning flex items-start gap-3">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <div>
              <strong className="font-semibold">Plan ready with 2 exceptions</strong> &mdash;{" "}
              <button type="button" className="text-link cursor-pointer">
                Show exceptions
              </button>
            </div>
          </div>
        </div>

        {/* Labeled Input & Single Primary Action Demonstration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-2 border-t border-[var(--color-border)]">
          <div className="space-y-1.5">
            <label htmlFor="sample-hall-label" className="block text-base font-medium text-[var(--color-text)]">
              Examination hall label
            </label>
            <input
              id="sample-hall-label"
              type="text"
              value={sampleHallName}
              onChange={(e) => setSampleHallName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <button
              type="button"
              onClick={() => showToast("Sample notification: roster ready for Step 2.", "success")}
              className="btn-secondary"
            >
              Preview toast
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as WizardStep) : 1))}
              className="btn-primary"
            >
              Continue to Hall
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
