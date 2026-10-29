"use client";

import React, { useRef, useState } from "react";
import { StepIndicator, WizardStep } from "@/components/StepIndicator";
import { Step1Students } from "@/components/Step1Students";
import { Step2Hall } from "@/components/Step2Hall";
import { Step3Results } from "@/components/Step3Results";
import { AssignResponse, HallConfig, PresetScenario, StudentRecord } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

const DEFAULT_HALL_CONFIG: HallConfig = {
  num_rooms: 1,
  rows: 8,
  cols: 4,
  seats_per_bench: 2,
  accessible_rule: "row_1",
  adjacency_rule: "orthogonal",
  invigilator_ratio: 20,
};

export default function HomePage() {
  const { showToast } = useToast();
  const mainHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [hallConfig, setHallConfig] = useState<HallConfig>(DEFAULT_HALL_CONFIG);
  const [assignResult, setAssignResult] = useState<AssignResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const moveToStep = (step: WizardStep) => {
    setCurrentStep(step);
    setApiError(null);
    window.requestAnimationFrame(() => {
      mainHeadingRef.current?.focus();
    });
  };

  const canNavigateToStep = (target: WizardStep): boolean => {
    if (target === 1) return true;
    if (target === 2) return students.length > 0;
    if (target === 3) return students.length > 0 && assignResult !== null;
    return false;
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setStudents(preset.students);
    setSourceLabel(preset.title);
    setHallConfig(preset.hallConfig);
    setAssignResult(null);
    showToast(`Loaded "${preset.title}" (${preset.students.length} students).`, "success");
    moveToStep(2);
  };

  const handleUploadStudents = (uploaded: StudentRecord[], filename: string) => {
    setStudents(uploaded);
    setSourceLabel(filename);
    setAssignResult(null);

    // Suggest a sensible hall count if the uploaded CSV has more than 64 students
    const seatsPerDefaultHall =
      DEFAULT_HALL_CONFIG.rows * DEFAULT_HALL_CONFIG.cols * DEFAULT_HALL_CONFIG.seats_per_bench;
    const neededRooms = Math.max(1, Math.ceil(uploaded.length / seatsPerDefaultHall));
    setHallConfig((prev) => ({
      ...prev,
      num_rooms: neededRooms,
    }));
  };

  const handleClearRoster = () => {
    setStudents([]);
    setSourceLabel(null);
    setAssignResult(null);
    setApiError(null);
  };

  const handleStartOver = () => {
    setStudents([]);
    setSourceLabel(null);
    setHallConfig(DEFAULT_HALL_CONFIG);
    setAssignResult(null);
    setApiError(null);
    moveToStep(1);
  };

  const handleGeneratePlan = async () => {
    if (students.length === 0) return;
    setIsGenerating(true);
    setApiError(null);

    const payload = {
      room_config: hallConfig,
      students,
    };

    try {
      const response = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const detail =
          errBody && typeof errBody.detail === "string"
            ? errBody.detail
            : "Could not generate the seating plan. Please check your hall size and try again.";
        throw new Error(detail);
      }

      const data: AssignResponse = await response.json();
      setAssignResult(data);
      showToast("Seating plan ready.", "success");
      moveToStep(3);
    } catch (err) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : "Unable to reach the seating service. Make sure the backend server is running.";
      const friendlyMsg = rawMsg.toLowerCase().includes("failed to fetch")
        ? "Could not connect to the seating service on port 8000. Please make sure the backend server is running."
        : rawMsg;
      setApiError(friendlyMsg);
      showToast(friendlyMsg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Page Intro & Step Indicator */}
      <div className="no-print space-y-6">
        <div className="space-y-2 max-w-2xl">
          <h1
            ref={mainHeadingRef}
            id="main-content"
            tabIndex={-1}
            className="text-3xl sm:text-4xl font-serif text-[var(--color-text)] outline-none"
          >
            Smart Examination Seating
          </h1>
          <p className="text-lg text-[var(--color-text-muted)]">
            Upload your students, pick a hall, and get a conflict-free exam seating plan in seconds.
          </p>
        </div>

        <StepIndicator
          currentStep={currentStep}
          canNavigateToStep={canNavigateToStep}
          onSelectStep={moveToStep}
        />
      </div>

      {apiError && (
        <div role="alert" className="no-print status-banner status-banner-error">
          <strong className="font-semibold">Could not generate seating plan:</strong> {apiError}
        </div>
      )}

      {currentStep === 1 && (
        <Step1Students
          students={students}
          sourceLabel={sourceLabel}
          onSelectPreset={handleSelectPreset}
          onUploadStudents={handleUploadStudents}
          onClearRoster={handleClearRoster}
          onContinueToHall={() => moveToStep(2)}
        />
      )}

      {currentStep === 2 && (
        <Step2Hall
          students={students}
          sourceLabel={sourceLabel}
          hallConfig={hallConfig}
          isGenerating={isGenerating}
          onChangeHallConfig={(next) => {
            setHallConfig(next);
            setAssignResult(null);
          }}
          onBackToStudents={() => moveToStep(1)}
          onGenerate={handleGeneratePlan}
        />
      )}

      {currentStep === 3 && assignResult && (
        <Step3Results
          result={assignResult}
          students={students}
          hallConfig={hallConfig}
          sourceLabel={sourceLabel}
          onEditHall={() => moveToStep(2)}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
