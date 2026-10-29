"use client";

import React, { useMemo } from "react";
import { AccessibleRule, AdjacencyRule, HallConfig, StudentRecord } from "@/lib/types";

interface Step2HallProps {
  students: StudentRecord[];
  sourceLabel: string | null;
  hallConfig: HallConfig;
  isGenerating: boolean;
  onChangeHallConfig: (next: HallConfig) => void;
  onBackToStudents: () => void;
  onGenerate: () => void;
}

function isSeatAccessible(
  row: number,
  seatInBench: number,
  seatsPerBench: number,
  rule: AccessibleRule
): boolean {
  const isFront = row === 1;
  const isAisle = seatInBench === 1 || seatInBench === seatsPerBench;

  if (rule === "row_1") return isFront;
  if (rule === "aisle") return isAisle;
  if (rule === "row_1_and_aisle") return isFront || isAisle;
  if (rule === "front_aisle_only") return isFront && isAisle;
  return false;
}

export function Step2Hall({
  students,
  sourceLabel,
  hallConfig,
  isGenerating,
  onChangeHallConfig,
  onBackToStudents,
  onGenerate,
}: Step2HallProps) {
  const seatsPerHall = hallConfig.rows * hallConfig.cols * hallConfig.seats_per_bench;
  const totalSeats = hallConfig.num_rooms * seatsPerHall;
  const totalStudents = students.length;
  const accessibleStudentsCount = useMemo(
    () => students.filter((s) => s.special_needs).length,
    [students]
  );

  const accessibleSeatsPerHall = useMemo(() => {
    let count = 0;
    for (let r = 1; r <= hallConfig.rows; r++) {
      for (let c = 1; c <= hallConfig.cols; c++) {
        for (let s = 1; s <= hallConfig.seats_per_bench; s++) {
          if (isSeatAccessible(r, s, hallConfig.seats_per_bench, hallConfig.accessible_rule)) {
            count++;
          }
        }
      }
    }
    return count;
  }, [hallConfig.rows, hallConfig.cols, hallConfig.seats_per_bench, hallConfig.accessible_rule]);

  const totalAccessibleSeats = hallConfig.num_rooms * accessibleSeatsPerHall;

  let disabledReason: string | null = null;
  if (totalStudents === 0) {
    disabledReason = "Add or select a student list in Step 1 before generating a plan.";
  } else if (totalSeats < totalStudents) {
    const shortage = totalStudents - totalSeats;
    disabledReason = `Need ${shortage} more ${
      shortage === 1 ? "seat" : "seats"
    } to fit all ${totalStudents} students. Increase rows, benches, or number of halls in Advanced options.`;
  } else if (totalAccessibleSeats < accessibleStudentsCount) {
    disabledReason = `${accessibleStudentsCount} students need accessible seats, but only ${totalAccessibleSeats} are available. Adjust hall dimensions or the accessible-seat rule in Advanced options.`;
  }

  const updateField = <K extends keyof HallConfig>(key: K, value: HallConfig[K]) => {
    onChangeHallConfig({ ...hallConfig, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          {sourceLabel && (
            <div className="text-sm font-semibold text-[var(--color-accent)]">
              Roster: {sourceLabel}
            </div>
          )}
          <h2 className="text-2xl font-serif">Configure your examination hall</h2>
          <p className="text-base text-[var(--color-text-muted)]">
            Set the desk layout and check capacity before generating your seating plan.
          </p>
        </div>

        <button type="button" onClick={onBackToStudents} className="btn-secondary self-start sm:self-auto">
          Change students
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Core 3 Inputs + Capacity Indicator + Collapsed Advanced Options + Primary CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="surface-card p-6 space-y-6">
            {/* Exactly 3 visible inputs by default */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="hall-rows" className="block text-base font-medium text-[var(--color-text)]">
                  Rows
                </label>
                <input
                  id="hall-rows"
                  type="number"
                  min={1}
                  max={25}
                  value={hallConfig.rows}
                  onChange={(e) =>
                    updateField("rows", Math.min(25, Math.max(1, parseInt(e.target.value, 10) || 1)))
                  }
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hall-benches" className="block text-base font-medium text-[var(--color-text)]">
                  Benches per row
                </label>
                <input
                  id="hall-benches"
                  type="number"
                  min={1}
                  max={12}
                  value={hallConfig.cols}
                  onChange={(e) =>
                    updateField("cols", Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)))
                  }
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hall-seats" className="block text-base font-medium text-[var(--color-text)]">
                  Seats per bench
                </label>
                <input
                  id="hall-seats"
                  type="number"
                  min={1}
                  max={6}
                  value={hallConfig.seats_per_bench}
                  onChange={(e) =>
                    updateField(
                      "seats_per_bench",
                      Math.min(6, Math.max(1, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="input-field"
                />
              </div>
            </div>

            {/* Live Capacity Indicator */}
            <div
              aria-live="polite"
              className={`p-4 border ${
                totalSeats >= totalStudents && totalAccessibleSeats >= accessibleStudentsCount
                  ? "bg-[var(--color-status-success-bg)] border-[var(--color-status-success-border)] text-[var(--color-status-success-text)]"
                  : "bg-[var(--color-status-error-bg)] border-[var(--color-status-error-border)] text-[var(--color-status-error-text)]"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="text-lg font-semibold">
                Seats: {totalSeats} &middot; Students: {totalStudents}
              </div>
              <div className="text-sm mt-0.5">
                {hallConfig.num_rooms > 1
                  ? `${hallConfig.num_rooms} halls × ${seatsPerHall} seats per hall`
                  : totalSeats >= totalStudents
                  ? `${totalSeats - totalStudents} spare ${
                      totalSeats - totalStudents === 1 ? "seat" : "seats"
                    } available`
                  : `${totalStudents - totalSeats} more ${
                      totalStudents - totalSeats === 1 ? "seat" : "seats"
                    } needed`}
              </div>
            </div>

            {/* Collapsed Advanced Options */}
            <details className="border border-[var(--color-border)] bg-[var(--color-surface-subtle)]" style={{ borderRadius: "var(--radius)" }}>
              <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between gap-2 text-base font-medium text-[var(--color-text)]">
                <span>Advanced options</span>
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  {hallConfig.num_rooms} {hallConfig.num_rooms === 1 ? "hall" : "halls"} &middot;{" "}
                  1:{hallConfig.invigilator_ratio} invigilator
                </span>
              </summary>

              <div className="p-4 pt-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="adv-num-halls" className="block text-base font-medium text-[var(--color-text)]">
                    Number of halls
                  </label>
                  <input
                    id="adv-num-halls"
                    type="number"
                    min={1}
                    max={20}
                    value={hallConfig.num_rooms}
                    onChange={(e) =>
                      updateField("num_rooms", Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))
                    }
                    className="input-field"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adv-accessible-rule" className="block text-base font-medium text-[var(--color-text)]">
                    Accessible-seat locations
                  </label>
                  <select
                    id="adv-accessible-rule"
                    value={hallConfig.accessible_rule}
                    onChange={(e) => updateField("accessible_rule", e.target.value as AccessibleRule)}
                    className="input-field"
                  >
                    <option value="row_1_and_aisle">Front row and bench ends (aisles)</option>
                    <option value="row_1">Front row only</option>
                    <option value="aisle">Bench ends (aisles) only</option>
                    <option value="front_aisle_only">Front-row bench ends only</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adv-diagonal-rule" className="block text-base font-medium text-[var(--color-text)]">
                    Neighbor spacing rule
                  </label>
                  <select
                    id="adv-diagonal-rule"
                    value={hallConfig.adjacency_rule}
                    onChange={(e) => updateField("adjacency_rule", e.target.value as AdjacencyRule)}
                    className="input-field"
                  >
                    <option value="orthogonal">Side-by-side and front-to-back</option>
                    <option value="diagonal">Also keep diagonal neighbors apart</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adv-invigilator-ratio" className="block text-base font-medium text-[var(--color-text)]">
                    Students per invigilator
                  </label>
                  <input
                    id="adv-invigilator-ratio"
                    type="number"
                    min={5}
                    max={100}
                    value={hallConfig.invigilator_ratio}
                    onChange={(e) =>
                      updateField(
                        "invigilator_ratio",
                        Math.min(100, Math.max(5, parseInt(e.target.value, 10) || 20))
                      )
                    }
                    className="input-field"
                  />
                </div>
              </div>
            </details>

            {/* Primary Button (Single Primary Action on Step 2) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onGenerate}
                disabled={Boolean(disabledReason) || isGenerating}
                aria-describedby={disabledReason ? "generate-disabled-reason" : undefined}
                className="btn-primary w-full"
              >
                {isGenerating ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="w-4 h-4 border-2 border-white/40 border-t-white animate-spin"
                      style={{ borderRadius: "9999px" }}
                    />
                    <span>Generating seating plan&hellip;</span>
                  </>
                ) : (
                  <span>Generate seating plan</span>
                )}
              </button>

              {disabledReason && (
                <p
                  id="generate-disabled-reason"
                  className="text-sm text-[var(--color-status-error-text)]"
                >
                  {disabledReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Hall Visual Preview */}
        <section
          aria-labelledby="hall-preview-heading"
          className="lg:col-span-7 surface-card p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 id="hall-preview-heading" className="text-lg font-serif">
                Live hall layout
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {hallConfig.rows} {hallConfig.rows === 1 ? "row" : "rows"} &times; {hallConfig.cols}{" "}
                {hallConfig.cols === 1 ? "bench" : "benches"} &times; {hallConfig.seats_per_bench}{" "}
                {hallConfig.seats_per_bench === 1 ? "seat" : "seats"} ({seatsPerHall} seats per hall
                {hallConfig.num_rooms > 1 ? `, × ${hallConfig.num_rooms} halls` : ""})
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 inline-block bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)]"
                  style={{ borderRadius: "2px" }}
                />
                Accessible
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 inline-block bg-[var(--color-surface)] border border-[var(--color-border-strong)]"
                  style={{ borderRadius: "2px" }}
                />
                Standard
              </span>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Visual preview of hall rows and benches"
            className="overflow-auto max-h-[34rem] p-1"
          >
            <div className="inline-flex flex-col gap-3 min-w-full">
              {/* Front of Hall Bar */}
              <div
                className="w-full py-2 px-4 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center text-sm font-medium text-[var(--color-text-muted)]"
                style={{ borderRadius: "var(--radius)" }}
              >
                Front of hall &middot; Invigilator desk
              </div>

              {/* Rows Grid */}
              <div className="space-y-2.5 pt-1">
                {Array.from({ length: hallConfig.rows }, (_, rIdx) => {
                  const rowNum = rIdx + 1;
                  return (
                    <div key={rowNum} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-sm font-medium text-[var(--color-text-muted)]">
                        Row {rowNum}
                      </span>

                      <div className="flex items-center gap-3 flex-1 justify-between">
                        {Array.from({ length: hallConfig.cols }, (_, cIdx) => {
                          const benchNum = cIdx + 1;
                          return (
                            <div
                              key={benchNum}
                              className="flex items-center gap-1.5 p-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border)]"
                              style={{ borderRadius: "var(--radius)" }}
                            >
                              {Array.from({ length: hallConfig.seats_per_bench }, (_, sIdx) => {
                                const seatNum = sIdx + 1;
                                const accessible = isSeatAccessible(
                                  rowNum,
                                  seatNum,
                                  hallConfig.seats_per_bench,
                                  hallConfig.accessible_rule
                                );
                                return (
                                  <div
                                    key={seatNum}
                                    title={`Row ${rowNum}, Bench ${benchNum}, Seat ${seatNum}${
                                      accessible ? " (Accessible)" : ""
                                    }`}
                                    className={`w-9 h-9 flex items-center justify-center text-xs font-medium border ${
                                      accessible
                                        ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent-border)] text-[var(--color-accent)]"
                                        : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
                                    }`}
                                    style={{ borderRadius: "var(--radius)" }}
                                  >
                                    S{seatNum}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
