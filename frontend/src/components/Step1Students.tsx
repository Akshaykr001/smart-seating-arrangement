"use client";

import React, { useMemo, useRef, useState } from "react";
import { SectionChip } from "@/components/SectionChip";
import { generateSampleCSV, parseStudentCSV, triggerCSVDownload } from "@/lib/csv";
import { PRESET_SCENARIOS } from "@/lib/presets";
import { PresetScenario, StudentRecord } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

interface Step1StudentsProps {
  students: StudentRecord[];
  sourceLabel: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
  onUploadStudents: (students: StudentRecord[], filename: string) => void;
  onClearRoster: () => void;
  onContinueToHall: () => void;
}

export function Step1Students({
  students,
  sourceLabel,
  onSelectPreset,
  onUploadStudents,
  onClearRoster,
  onContinueToHall,
}: Step1StudentsProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(() => {
    const sections = new Set(students.map((s) => s.student_class));
    const subjects = new Set(students.map((s) => s.subject));
    const accessible = students.filter((s) => s.special_needs).length;
    return {
      total: students.length,
      sectionsCount: sections.size,
      subjectsCount: subjects.size,
      accessibleCount: accessible,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.student_class.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const processFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setCsvErrors([
        `File "${file.name}" is not a CSV file. Please upload a .csv spreadsheet.`,
      ]);
      showToast("Please upload a .csv file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result ?? "");
      const { students: parsed, errors } = parseStudentCSV(text);
      setCsvErrors(errors);

      if (parsed.length > 0 && errors.length === 0) {
        onUploadStudents(parsed, file.name);
        showToast(`Loaded ${parsed.length} students from ${file.name}.`, "success");
      } else if (parsed.length > 0 && errors.length > 0) {
        onUploadStudents(parsed, file.name);
        showToast(
          `Loaded ${parsed.length} valid rows; ${errors.length} row${
            errors.length === 1 ? "" : "s"
          } need attention.`,
          "error"
        );
      } else {
        showToast("Could not load students from CSV. Check the row errors below.", "error");
      }
    };
    reader.onerror = () => {
      setCsvErrors(["Could not read the selected file. Please try saving it again as UTF-8 CSV."]);
      showToast("Failed to read file.", "error");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleSampleDownload = () => {
    triggerCSVDownload("sample_exam_students.csv", generateSampleCSV());
    showToast("Sample CSV downloaded.", "success");
  };

  return (
    <div className="space-y-8">
      {/* Loaded Roster Summary & Preview (shown once CSV is uploaded or when returning to Step 1) */}
      {students.length > 0 && (
        <section
          aria-labelledby="loaded-roster-heading"
          className="surface-card p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div className="space-y-1">
              {sourceLabel && (
                <div className="text-sm font-medium text-[var(--color-accent)]">
                  Loaded: {sourceLabel}
                </div>
              )}
              <h2 id="loaded-roster-heading" className="text-xl sm:text-2xl font-serif">
                {stats.total} {stats.total === 1 ? "student" : "students"} &middot;{" "}
                {stats.sectionsCount} {stats.sectionsCount === 1 ? "section" : "sections"} &middot;{" "}
                {stats.subjectsCount} {stats.subjectsCount === 1 ? "subject" : "subjects"} &middot;{" "}
                {stats.accessibleCount}{" "}
                {stats.accessibleCount === 1 ? "needs an accessible seat" : "need accessible seats"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClearRoster();
                  setCsvErrors([]);
                  setSearchQuery("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="btn-secondary"
              >
                Clear roster
              </button>
              <button type="button" onClick={onContinueToHall} className="btn-primary">
                Continue to Hall
              </button>
            </div>
          </div>

          {/* Searchable Table Preview (1 visible labeled input) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="w-full sm:max-w-sm space-y-1.5">
                <label
                  htmlFor="roster-preview-search"
                  className="block text-base font-medium text-[var(--color-text)]"
                >
                  Search student preview
                </label>
                <input
                  id="roster-preview-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID, name, section, or subject"
                  className="input-field"
                />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Showing {filteredStudents.length} of {students.length} students
              </p>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center border border-[var(--color-border)] bg-[var(--color-surface-subtle)]" style={{ borderRadius: "var(--radius)" }}>
                <p className="text-base text-[var(--color-text-muted)]">
                  No students match &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            ) : (
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="roster-table-caption"
                className="max-h-72 overflow-auto border border-[var(--color-border)]"
                style={{ borderRadius: "var(--radius)" }}
              >
                <table className="w-full text-left border-collapse">
                  <caption id="roster-table-caption" className="visually-hidden">
                    Loaded student roster preview
                  </caption>
                  <thead className="sticky top-0 z-10 bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Student ID</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Section</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Accessible seat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-base bg-[var(--color-surface)]">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-[var(--color-surface-subtle)] transition-colors">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{stu.id}</td>
                        <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                          {stu.name || "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <SectionChip section={stu.student_class} compact />
                        </td>
                        <td className="px-4 py-2.5">{stu.subject}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {stu.special_needs ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)]">
                              <svg
                                aria-hidden="true"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="4.5" r="2" />
                                <path d="M9 9h6l-1 5h4l1 5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M6.5 14a5 5 0 1 0 7.5 4.3" strokeLinecap="round" />
                              </svg>
                              Yes
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-muted)]">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Two Clear Side-by-Side Choices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Choice 1: Try a demo scenario */}
        <section aria-labelledby="demo-scenarios-heading" className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <h2 id="demo-scenarios-heading" className="text-2xl font-serif">
              Try a demo scenario
            </h2>
            <p className="text-base text-[var(--color-text-muted)]">
              Click any scenario to load its student list and move straight to hall setup.
            </p>
          </div>

          <ul role="list" className="space-y-3">
            {PRESET_SCENARIOS.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCsvErrors([]);
                    onSelectPreset(preset);
                  }}
                  className="surface-card w-full text-left p-5 hover:border-[var(--color-accent)] hover:bg-[#FCFBF9] transition-colors cursor-pointer space-y-3 group"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-serif text-lg font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                      {preset.title}
                    </span>
                    <span
                      className="text-sm font-semibold px-2.5 py-0.5 bg-[var(--color-surface-subtle)] text-[var(--color-text)] border border-[var(--color-border)]"
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      {preset.students.length} students
                    </span>
                  </div>

                  <p className="text-base text-[var(--color-text-muted)]">
                    {preset.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {preset.sectionCounts.map((item) => (
                      <SectionChip
                        key={item.section}
                        section={item.section}
                        count={item.count}
                        compact
                      />
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Choice 2: Upload your own CSV */}
        <section aria-labelledby="csv-upload-heading" className="lg:col-span-5 space-y-4">
          <div className="space-y-1">
            <h2 id="csv-upload-heading" className="text-2xl font-serif">
              Upload your own CSV
            </h2>
            <p className="text-base text-[var(--color-text-muted)]">
              Import a student roster spreadsheet from your exam office records.
            </p>
          </div>

          <div className="surface-card p-6 space-y-5">
            <label
              htmlFor="csv-upload-input"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center text-center p-8 border border-dashed cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2 ${
                isDragging
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-accent)]"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              <input
                ref={fileInputRef}
                id="csv-upload-input"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => processFile(e.target.files?.[0])}
                className="visually-hidden"
              />

              <span
                aria-hidden="true"
                className="w-12 h-12 mb-3 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]"
                style={{ borderRadius: "var(--radius)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
              </span>

              <span className="text-base font-medium text-[var(--color-text)]">
                Drop your CSV file here, or click to browse
              </span>
              <span className="text-sm text-[var(--color-text-muted)] mt-1">
                Columns: ID, Name (optional), Section, Subject, Accessible (Yes/No)
              </span>
            </label>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-sm text-[var(--color-text-muted)]">
                Need a template?
              </span>
              <button
                type="button"
                onClick={handleSampleDownload}
                className="text-link text-base cursor-pointer bg-transparent border-0 p-0"
              >
                Download sample CSV
              </button>
            </div>

            {/* Friendly Row-Level Inline Validation Errors */}
            {csvErrors.length > 0 && (
              <div
                role="alert"
                className="status-banner status-banner-error space-y-2"
              >
                <div className="font-semibold">
                  Please check {csvErrors.length === 1 ? "this issue" : `these ${csvErrors.length} issues`} in your CSV:
                </div>
                <ul role="list" className="list-disc pl-5 space-y-1 text-sm">
                  {csvErrors.slice(0, 8).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {csvErrors.length > 8 && (
                    <li>&hellip;and {csvErrors.length - 8} more row issues.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
