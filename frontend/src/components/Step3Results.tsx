"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SectionChip } from "@/components/SectionChip";
import { getSectionStyle } from "@/lib/sections";
import { triggerCSVDownload } from "@/lib/csv";
import {
  AssignResponse,
  HallConfig,
  RoomAllocation,
  SeatCell,
  StudentRecord,
} from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

interface Step3ResultsProps {
  result: AssignResponse;
  students: StudentRecord[];
  hallConfig: HallConfig;
  sourceLabel: string | null;
  onEditHall: () => void;
  onStartOver: () => void;
}

type DetailTab = "seats" | "invigilators" | "summary";

interface ActiveSeatDetail {
  room_id: number;
  seat: SeatCell;
  studentName: string;
  exceptionNotes: string[];
}

function AccessibleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="12" cy="4.5" r="2" />
      <path d="M9 9h6l-1 5h4l1 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 14a5 5 0 1 0 7.5 4.3" strokeLinecap="round" />
    </svg>
  );
}

export function Step3Results({
  result,
  students,
  hallConfig,
  sourceLabel,
  onEditHall,
  onStartOver,
}: Step3ResultsProps) {
  const { showToast } = useToast();

  const classConflicts = useMemo(() => result.class_conflicts ?? [], [result.class_conflicts]);
  const subjectOverlaps = useMemo(
    () => result.relaxed_constraints ?? [],
    [result.relaxed_constraints]
  );

  const hasSectionConflicts = classConflicts.length > 0;
  const totalExceptionPairs = classConflicts.length + subjectOverlaps.length;

  const [showExceptions, setShowExceptions] = useState<boolean>(hasSectionConflicts);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    result.room_allocations[0]?.room_id ?? 1
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("seats");
  const [seatSearch, setSeatSearch] = useState("");
  const [selectedSeatDetail, setSelectedSeatDetail] = useState<ActiveSeatDetail | null>(null);

  useEffect(() => {
    setShowExceptions(hasSectionConflicts);
    setSelectedRoomId(result.room_allocations[0]?.room_id ?? 1);
    setSelectedSeatDetail(null);
  }, [result, hasSectionConflicts]);

  // Lookup student names from original roster
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.name) map.set(s.id, s.name);
    }
    return map;
  }, [students]);

  // Map seat_id -> human-readable exception descriptions
  const exceptionsBySeat = useMemo(() => {
    const map = new Map<string, string[]>();
    const addNote = (seatId: string, note: string) => {
      const existing = map.get(seatId) ?? [];
      if (!existing.includes(note)) {
        existing.push(note);
        map.set(seatId, existing);
      }
    };

    for (const c of classConflicts) {
      addNote(c.seat_a, `Adjacent to ${c.student_b} (same section: ${c.section})`);
      addNote(c.seat_b, `Adjacent to ${c.student_a} (same section: ${c.section})`);
    }

    for (const s of subjectOverlaps) {
      addNote(s.seat_a, `Adjacent to ${s.student_b} (same subject: ${s.subject})`);
      addNote(s.seat_b, `Adjacent to ${s.student_a} (same subject: ${s.subject})`);
    }

    return map;
  }, [classConflicts, subjectOverlaps]);

  const conflictingSectionsList = useMemo(() => {
    const secs = Array.from(new Set(classConflicts.map((c) => c.section)));
    return secs.join(", ");
  }, [classConflicts]);

  const activeRoom: RoomAllocation | undefined = useMemo(
    () =>
      result.room_allocations.find((r) => r.room_id === selectedRoomId) ??
      result.room_allocations[0],
    [result.room_allocations, selectedRoomId]
  );

  // Distinct sections in this plan for legend & summary
  const sectionSummary = useMemo(() => {
    const map = new Map<
      string,
      { section: string; count: number; accessible: number; subjects: Set<string> }
    >();
    for (const row of result.flat_allocation_table) {
      const entry = map.get(row.class) ?? {
        section: row.class,
        count: 0,
        accessible: 0,
        subjects: new Set<string>(),
      };
      entry.count += 1;
      if (row.special_needs) entry.accessible += 1;
      if (row.subject) entry.subjects.add(row.subject);
      map.set(row.class, entry);
    }
    return Array.from(map.values());
  }, [result.flat_allocation_table]);

  // Enriched flat seat rows
  const enrichedRows = useMemo(() => {
    return result.flat_allocation_table.map((r) => {
      const name = r.name || nameById.get(r.student_id) || "";
      const notes = exceptionsBySeat.get(r.seat_id) ?? [];
      return {
        ...r,
        studentName: name,
        notes,
      };
    });
  }, [result.flat_allocation_table, nameById, exceptionsBySeat]);

  const filteredSeatRows = useMemo(() => {
    const q = seatSearch.trim().toLowerCase();
    if (!q) return enrichedRows;
    return enrichedRows.filter(
      (r) =>
        r.student_id.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.class.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.seat_label.toLowerCase().includes(q) ||
        `hall ${r.room_id}`.includes(q)
    );
  }, [enrichedRows, seatSearch]);

  // Invigilator duty posts per hall
  const invigilatorSchedule = useMemo(() => {
    return result.room_allocations.map((room) => {
      const count = room.invigilators_needed;
      const posts: Array<{ postLabel: string; rowRange: string }> = [];
      if (count > 0) {
        const rowsPerInvig = Math.ceil(room.rows / count);
        for (let i = 0; i < count; i++) {
          const startRow = i * rowsPerInvig + 1;
          const endRow = Math.min(room.rows, (i + 1) * rowsPerInvig);
          const rowRange =
            startRow <= endRow
              ? startRow === endRow
                ? `Row ${startRow}`
                : `Rows ${startRow}–${endRow}`
              : `All rows (relief)`;
          posts.push({
            postLabel: `Invigilator ${i + 1}`,
            rowRange,
          });
        }
      }
      return {
        room_id: room.room_id,
        student_count: room.student_count,
        special_needs_count: room.special_needs_count,
        invigilators_needed: count,
        exceptions_count: room.class_violations + room.subject_violations,
        posts,
      };
    });
  }, [result.room_allocations]);

  const handleDownloadCSV = () => {
    const headers = [
      "Hall",
      "Seat_Location",
      "Student_ID",
      "Name",
      "Section",
      "Subject",
      "Accessible_Seat",
      "Notes",
    ];
    const lines = [headers.join(",")];
    for (const r of enrichedRows) {
      const cells = [
        `Hall ${r.room_id}`,
        r.seat_label.replace(/^Room\s+\d+\s*/i, "").replace(/[\[\]]/g, ""),
        r.student_id,
        r.studentName,
        r.class,
        r.subject,
        r.special_needs ? "Yes" : "No",
        r.notes.length > 0 ? r.notes.join("; ") : "None",
      ];
      lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    }
    const slug = (sourceLabel || "exam_seating_plan")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    triggerCSVDownload(`${slug || "seating_plan"}.csv`, lines.join("\n"));
    showToast("Downloaded seating plan CSV.", "success");
  };

  const handlePrint = () => {
    window.print();
  };

  const openSeatInspector = (room_id: number, seat: SeatCell) => {
    if (!seat.student) return;
    const studentName = seat.student.name || nameById.get(seat.student.id) || "";
    const exceptionNotes = exceptionsBySeat.get(seat.seat_id) ?? [];
    setSelectedSeatDetail({
      room_id,
      seat,
      studentName,
      exceptionNotes,
    });
  };

  const tabOrder: DetailTab[] = ["seats", "invigilators", "summary"];
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: DetailTab) => {
    const idx = tabOrder.indexOf(current);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabOrder[(idx + 1) % tabOrder.length];
      setActiveTab(next);
      document.getElementById(`tab-btn-${next}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length];
      setActiveTab(prev);
      document.getElementById(`tab-btn-${prev}`)?.focus();
    }
  };

  return (
    <div className="space-y-8">
      {/* Screen Interactive View (hidden when printing) */}
      <div className="no-print space-y-8">
        {/* Top Status Banner */}
        {totalExceptionPairs === 0 ? (
          <div role="status" className="status-banner status-banner-success flex items-start gap-3">
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="mt-0.5 shrink-0"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <strong className="font-semibold">All constraints satisfied</strong> &mdash; no two
              students from the same section sit next to each other.
            </div>
          </div>
        ) : hasSectionConflicts ? (
          <div
            role="status"
            className="status-banner status-banner-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                width="22"
                height="22"
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
                This hall is too small to keep every{" "}
                <strong className="font-semibold">{conflictingSectionsList || "same-section"}</strong>{" "}
                student apart, so here is the best possible seating plan with the{" "}
                {classConflicts.length === 1
                  ? "1 unavoidable adjacent pair"
                  : `unavoidable adjacent seats`}{" "}
                highlighted.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExceptions((prev) => !prev)}
              aria-pressed={showExceptions}
              className="text-link shrink-0 self-start sm:self-center cursor-pointer bg-transparent border-0 p-0 text-base"
            >
              {showExceptions ? "Hide exceptions" : "Show exceptions"}
            </button>
          </div>
        ) : (
          <div
            role="status"
            className="status-banner status-banner-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                width="22"
                height="22"
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
                <strong className="font-semibold">
                  Plan ready with {subjectOverlaps.length}{" "}
                  {subjectOverlaps.length === 1 ? "exception" : "exceptions"}
                </strong>{" "}
                &mdash; all sections are separated, with {subjectOverlaps.length} adjacent{" "}
                {subjectOverlaps.length === 1 ? "pair" : "pairs"} writing the same subject.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExceptions((prev) => !prev)}
              aria-pressed={showExceptions}
              className="text-link shrink-0 self-start sm:self-center cursor-pointer bg-transparent border-0 p-0 text-base"
            >
              {showExceptions ? "Hide exceptions" : "Show exceptions"}
            </button>
          </div>
        )}

        {/* Header & Actions Row (Only ONE primary button: Print / Save as PDF) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-serif">
              {sourceLabel ? sourceLabel : "Examination seating plan"}
            </h2>
            <p className="text-base text-[var(--color-text-muted)]">
              {enrichedRows.length} students seated across {result.room_allocations.length}{" "}
              {result.room_allocations.length === 1 ? "hall" : "halls"} &middot; Hover or tap any
              desk to view student details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onStartOver} className="btn-secondary">
              Start over
            </button>
            <button type="button" onClick={handleDownloadCSV} className="btn-secondary">
              Download CSV
            </button>
            <button type="button" onClick={handlePrint} className="btn-primary">
              Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Main Seat Map Card */}
        {activeRoom && (
          <section aria-labelledby="seat-map-heading" className="surface-card p-6 space-y-6">
            {/* Multi-Hall Switcher + Section Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="seat-map-heading" className="text-lg font-serif mr-2">
                  Seat map
                </h3>
                {result.room_allocations.length > 1 &&
                  result.room_allocations.map((r) => {
                    const isSelected = r.room_id === activeRoom.room_id;
                    return (
                      <button
                        key={r.room_id}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(r.room_id);
                          setSelectedSeatDetail(null);
                        }}
                        aria-pressed={isSelected}
                        className={`px-3 py-1.5 text-sm font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
                        }`}
                        style={{ borderRadius: "var(--radius)" }}
                      >
                        Hall {r.room_id} ({r.student_count})
                      </button>
                    );
                  })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sectionSummary.map((s) => (
                  <SectionChip key={s.section} section={s.section} compact />
                ))}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] pl-1">
                  <AccessibleIcon size={14} /> Accessible seat
                </span>
              </div>
            </div>

            {/* Selected / Hovered Student Inspector Panel */}
            <div
              aria-live="polite"
              className="floating-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)]"
            >
              {selectedSeatDetail && selectedSeatDetail.seat.student ? (
                <>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-base text-[var(--color-text)]">
                        {selectedSeatDetail.seat.student.id}
                      </span>
                      {selectedSeatDetail.studentName && (
                        <span className="text-base text-[var(--color-text)]">
                          &middot; {selectedSeatDetail.studentName}
                        </span>
                      )}
                      <SectionChip section={selectedSeatDetail.seat.student.class} compact />
                      {selectedSeatDetail.seat.student.special_needs && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)]"
                          style={{ borderRadius: "var(--radius)" }}
                        >
                          <AccessibleIcon size={13} /> Accessible seat assigned
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      Subject:{" "}
                      <strong className="font-medium text-[var(--color-text)]">
                        {selectedSeatDetail.seat.student.subject}
                      </strong>{" "}
                      &middot; Hall {selectedSeatDetail.room_id}, Row {selectedSeatDetail.seat.row},
                      Bench {selectedSeatDetail.seat.bench}, Seat {selectedSeatDetail.seat.seat_num}
                    </div>
                    {selectedSeatDetail.exceptionNotes.length > 0 && (
                      <div className="text-sm font-medium text-[var(--color-status-warning-text)]">
                        Note: {selectedSeatDetail.exceptionNotes.join(" · ")}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSeatDetail(null)}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] self-end sm:self-center cursor-pointer"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Hover, focus, or tap any occupied seat below to inspect the student&apos;s ID, name,
                  section, and subject.
                </p>
              )}
            </div>

            {/* Scrollable Seat Grid Container */}
            <div
              tabIndex={0}
              role="region"
              aria-label={`Hall ${activeRoom.room_id} seating grid`}
              className="overflow-x-auto pb-2"
            >
              <div className="inline-flex flex-col gap-3 min-w-full">
                {/* Front of Hall Orientation Bar */}
                <div
                  className="w-full py-2 px-4 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center text-sm font-medium text-[var(--color-text-muted)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  Front of Hall {activeRoom.room_id} &middot; Invigilator desk
                </div>

                {/* Rows */}
                <div className="space-y-2.5 pt-1">
                  {activeRoom.seats_grid.map((row) => (
                    <div key={row.row_num} className="flex items-center gap-3">
                      <div className="w-12 shrink-0 text-sm font-medium text-[var(--color-text-muted)]">
                        Row {row.row_num}
                      </div>

                      <div className="flex items-center gap-2.5 flex-1 justify-between">
                        {row.benches.map((bench) => (
                          <div
                            key={bench.bench_num}
                            className="flex items-center gap-1.5 p-1.5 bg-[var(--color-surface-subtle)] border border-[var(--color-border)]"
                            style={{ borderRadius: "var(--radius)" }}
                          >
                            {bench.seats.map((seat) => {
                              const stu = seat.student;
                              const seatExceptions = exceptionsBySeat.get(seat.seat_id) ?? [];
                              const isHighlighted = showExceptions && seatExceptions.length > 0;

                              if (!stu) {
                                return (
                                  <div
                                    key={seat.seat_id}
                                    className="w-[104px] h-[76px] p-2 flex flex-col justify-between border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                                    style={{ borderRadius: "var(--radius)" }}
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span>
                                        B{seat.bench}&middot;S{seat.seat_num}
                                      </span>
                                      {seat.accessible && (
                                        <span title="Accessible seat" className="opacity-70">
                                          <AccessibleIcon size={12} />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs">Empty</span>
                                  </div>
                                );
                              }

                              const secStyle = getSectionStyle(stu.class);
                              const stuName = stu.name || nameById.get(stu.id) || "";

                              return (
                                <button
                                  key={seat.seat_id}
                                  type="button"
                                  onMouseEnter={() => openSeatInspector(activeRoom.room_id, seat)}
                                  onFocus={() => openSeatInspector(activeRoom.room_id, seat)}
                                  onClick={() => openSeatInspector(activeRoom.room_id, seat)}
                                  aria-label={`Row ${seat.row} Bench ${seat.bench} Seat ${seat.seat_num}: ${stu.id}${
                                    stuName ? `, ${stuName}` : ""
                                  }, section ${stu.class}, subject ${stu.subject}${
                                    stu.special_needs ? ", accessible seat assigned" : ""
                                  }${
                                    seatExceptions.length > 0
                                      ? `, exception: ${seatExceptions.join(", ")}`
                                      : ""
                                  }`}
                                  className="w-[104px] h-[76px] p-2 text-left flex flex-col justify-between transition-transform cursor-pointer relative"
                                  style={{
                                    borderRadius: "var(--radius)",
                                    backgroundColor: secStyle.bg,
                                    color: secStyle.text,
                                    border: isHighlighted
                                      ? "2px solid var(--color-status-warning-text)"
                                      : `1px solid ${secStyle.border}`,
                                    boxShadow: isHighlighted
                                      ? "0 0 0 2px var(--color-status-warning-bg)"
                                      : "none",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1 w-full">
                                    <span className="text-xs font-bold tracking-tight truncate">
                                      {secStyle.shortLabel}
                                    </span>

                                    <span className="inline-flex items-center gap-1 shrink-0">
                                      {isHighlighted && (
                                        <span
                                          title="Flagged exception"
                                          aria-hidden="true"
                                          className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)]"
                                          style={{ borderRadius: "4px" }}
                                        >
                                          !
                                        </span>
                                      )}
                                      {seat.accessible && (
                                        <span
                                          title={
                                            stu.special_needs
                                              ? "Accessible seat (assigned)"
                                              : "Accessible seat"
                                          }
                                          className={
                                            stu.special_needs
                                              ? "p-0.5 bg-white/90 text-[var(--color-accent)] border border-[var(--color-accent-border)]"
                                              : "opacity-65"
                                          }
                                          style={{ borderRadius: "4px" }}
                                        >
                                          <AccessibleIcon size={12} />
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  <div className="w-full">
                                    <div className="text-sm font-semibold leading-tight truncate">
                                      {stu.id}
                                    </div>
                                    <div className="text-xs opacity-90 truncate">
                                      {stu.subject}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
              <span>
                Hall {activeRoom.room_id}: {activeRoom.student_count} seated &middot;{" "}
                {activeRoom.invigilators_needed}{" "}
                {activeRoom.invigilators_needed === 1 ? "invigilator" : "invigilators"}
              </span>
              <button
                type="button"
                onClick={onEditHall}
                className="text-link cursor-pointer bg-transparent border-0 p-0 text-sm"
              >
                Adjust hall dimensions
              </button>
            </div>
          </section>
        )}

        {/* Detail Tabs: Seat list · Invigilators · Summary */}
        <section aria-label="Plan details" className="surface-card p-6 space-y-6">
          <div
            role="tablist"
            aria-label="Seating plan views"
            className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
          >
            <button
              id="tab-btn-seats"
              role="tab"
              type="button"
              aria-selected={activeTab === "seats"}
              aria-controls="tab-panel-seats"
              tabIndex={activeTab === "seats" ? 0 : -1}
              onClick={() => setActiveTab("seats")}
              onKeyDown={(e) => handleTabKeyDown(e, "seats")}
              className={`px-4 py-2 text-base font-medium cursor-pointer transition-colors ${
                activeTab === "seats"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              Seat list ({enrichedRows.length})
            </button>

            <button
              id="tab-btn-invigilators"
              role="tab"
              type="button"
              aria-selected={activeTab === "invigilators"}
              aria-controls="tab-panel-invigilators"
              tabIndex={activeTab === "invigilators" ? 0 : -1}
              onClick={() => setActiveTab("invigilators")}
              onKeyDown={(e) => handleTabKeyDown(e, "invigilators")}
              className={`px-4 py-2 text-base font-medium cursor-pointer transition-colors ${
                activeTab === "invigilators"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              Invigilators (
              {invigilatorSchedule.reduce((acc, r) => acc + r.invigilators_needed, 0)})
            </button>

            <button
              id="tab-btn-summary"
              role="tab"
              type="button"
              aria-selected={activeTab === "summary"}
              aria-controls="tab-panel-summary"
              tabIndex={activeTab === "summary" ? 0 : -1}
              onClick={() => setActiveTab("summary")}
              onKeyDown={(e) => handleTabKeyDown(e, "summary")}
              className={`px-4 py-2 text-base font-medium cursor-pointer transition-colors ${
                activeTab === "summary"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
              }`}
              style={{ borderRadius: "var(--radius)" }}
            >
              Summary
            </button>
          </div>

          {/* Tab 1: Searchable Seat List */}
          {activeTab === "seats" && (
            <div id="tab-panel-seats" role="tabpanel" aria-labelledby="tab-btn-seats" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="w-full sm:max-w-sm space-y-1.5">
                  <label
                    htmlFor="seat-list-search"
                    className="block text-base font-medium text-[var(--color-text)]"
                  >
                    Search seat list
                  </label>
                  <input
                    id="seat-list-search"
                    type="search"
                    value={seatSearch}
                    onChange={(e) => setSeatSearch(e.target.value)}
                    placeholder="ID, name, section, subject, or hall"
                    className="input-field"
                  />
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Showing {filteredSeatRows.length} of {enrichedRows.length} assigned seats
                </p>
              </div>

              {filteredSeatRows.length === 0 ? (
                <div
                  className="p-8 text-center border border-[var(--color-border)] bg-[var(--color-surface-subtle)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <p className="text-base text-[var(--color-text-muted)]">
                    No seats match &ldquo;{seatSearch}&rdquo;.
                  </p>
                </div>
              ) : (
                <div
                  tabIndex={0}
                  role="region"
                  aria-labelledby="seat-list-table-caption"
                  className="max-h-96 overflow-auto border border-[var(--color-border)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <table className="w-full text-left border-collapse">
                    <caption id="seat-list-table-caption" className="visually-hidden">
                      Assigned student seat list
                    </caption>
                    <thead className="sticky top-0 z-10 bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Hall &amp; Desk</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Student ID</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Section</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-base bg-[var(--color-surface)]">
                      {filteredSeatRows.map((row) => (
                        <tr key={row.seat_id} className="hover:bg-[var(--color-surface-subtle)]">
                          <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                            Hall {row.room_id} &middot;{" "}
                            <span className="text-[var(--color-text-muted)] font-normal">
                              {row.seat_label.replace(/^Room\s+\d+\s*/i, "").replace(/[\[\]]/g, "")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                            {row.student_id}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                            {row.studentName || "—"}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <SectionChip section={row.class} compact />
                          </td>
                          <td className="px-4 py-2.5">{row.subject}</td>
                          <td className="px-4 py-2.5 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.special_needs && (
                                <span className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)]">
                                  <AccessibleIcon size={14} /> Accessible
                                </span>
                              )}
                              {row.notes.length > 0 && (
                                <span className="text-[var(--color-status-warning-text)] font-medium">
                                  {row.notes[0]}
                                </span>
                              )}
                              {!row.special_needs && row.notes.length === 0 && (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Invigilators */}
          {activeTab === "invigilators" && (
            <div
              id="tab-panel-invigilators"
              role="tabpanel"
              aria-labelledby="tab-btn-invigilators"
              className="space-y-4"
            >
              <p className="text-base text-[var(--color-text-muted)]">
                Calculated at 1 invigilator per {hallConfig.invigilator_ratio} students (minimum 1
                per occupied hall).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invigilatorSchedule.map((hall) => (
                  <div
                    key={hall.room_id}
                    className="p-5 border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-3"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-lg font-serif">Hall {hall.room_id}</h4>
                      <span className="text-sm font-semibold text-[var(--color-accent)]">
                        {hall.invigilators_needed}{" "}
                        {hall.invigilators_needed === 1 ? "invigilator" : "invigilators"}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {hall.student_count} students seated &middot; {hall.special_needs_count} in
                      accessible seats
                      {hall.exceptions_count > 0
                        ? ` · ${hall.exceptions_count} flagged ${
                            hall.exceptions_count === 1 ? "pair" : "pairs"
                          } to monitor`
                        : ""}
                    </p>
                    {hall.posts.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No students assigned to this hall.
                      </p>
                    ) : (
                      <ul role="list" className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)] border border-[var(--color-border)]" style={{ borderRadius: "var(--radius)" }}>
                        {hall.posts.map((post) => (
                          <li
                            key={post.postLabel}
                            className="px-4 py-2.5 flex items-center justify-between text-base"
                          >
                            <span className="font-medium">{post.postLabel}</span>
                            <span className="text-sm text-[var(--color-text-muted)]">
                              {post.rowRange}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Summary (Counts per Section + Counts per Hall) */}
          {activeTab === "summary" && (
            <div
              id="tab-panel-summary"
              role="tabpanel"
              aria-labelledby="tab-btn-summary"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="space-y-3">
                <h4 className="text-lg font-serif">Students per section</h4>
                <div className="border border-[var(--color-border)] overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
                  <table className="w-full text-left border-collapse">
                    <caption className="visually-hidden">Student count per section</caption>
                    <thead className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Section</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Students</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Accessible</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Subjects</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-base">
                      {sectionSummary.map((sec) => (
                        <tr key={sec.section}>
                          <td className="px-4 py-2.5">
                            <SectionChip section={sec.section} compact />
                          </td>
                          <td className="px-4 py-2.5 font-medium">{sec.count}</td>
                          <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                            {sec.accessible}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-[var(--color-text-muted)]">
                            {Array.from(sec.subjects).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-serif">Occupancy per hall</h4>
                <div className="border border-[var(--color-border)] overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
                  <table className="w-full text-left border-collapse">
                    <caption className="visually-hidden">Occupancy and invigilator count per hall</caption>
                    <thead className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Hall</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Seated</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Accessible</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Invigilators</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Exceptions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-base">
                      {result.room_allocations.map((room) => {
                        const cap = room.rows * room.cols * room.seats_per_bench;
                        const exc = room.class_violations + room.subject_violations;
                        return (
                          <tr key={room.room_id}>
                            <td className="px-4 py-2.5 font-medium">Hall {room.room_id}</td>
                            <td className="px-4 py-2.5">
                              {room.student_count} / {cap}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                              {room.special_needs_count}
                            </td>
                            <td className="px-4 py-2.5">{room.invigilators_needed}</td>
                            <td className="px-4 py-2.5">
                              {exc === 0 ? "None" : exc}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Clean Print / PDF Stylesheet Output: One Hall Per Page + Invigilator List */}
      <div className="hidden print:block text-black">
        {result.room_allocations.map((room) => (
          <div
            key={room.room_id}
            style={{ breakAfter: "page", pageBreakAfter: "always" }}
            className="space-y-4 pb-4"
          >
            <div className="border-b border-black pb-2 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-serif font-semibold">
                  Smart Examination Seating &mdash; Hall {room.room_id} Chart
                </h2>
                <p className="text-xs">
                  {sourceLabel ? `${sourceLabel} · ` : ""}
                  {room.student_count} students seated &middot; {room.invigilators_needed}{" "}
                  {room.invigilators_needed === 1 ? "invigilator" : "invigilators"} assigned
                </p>
              </div>
              <span className="text-xs font-medium">Front of Hall at Top</span>
            </div>

            <div className="space-y-2">
              {room.seats_grid.map((row) => (
                <div key={row.row_num} className="flex items-stretch gap-2">
                  <div className="w-12 shrink-0 text-xs font-semibold flex items-center">
                    Row {row.row_num}
                  </div>
                  <div className="flex gap-2 flex-1">
                    {row.benches.map((bench) => (
                      <div
                        key={bench.bench_num}
                        className="flex gap-1 p-1 border border-gray-400 flex-1"
                      >
                        {bench.seats.map((seat) => {
                          const stu = seat.student;
                          const stuName = stu ? stu.name || nameById.get(stu.id) || "" : "";
                          return (
                            <div
                              key={seat.seat_id}
                              className="flex-1 p-1 border border-gray-300 text-[10px] leading-tight"
                            >
                              {stu ? (
                                <>
                                  <div className="font-bold">
                                    {stu.id} {stu.special_needs ? "[Acc]" : ""}
                                  </div>
                                  {stuName && <div className="truncate">{stuName}</div>}
                                  <div className="font-medium">{stu.class}</div>
                                  <div className="truncate text-gray-700">{stu.subject}</div>
                                </>
                              ) : (
                                <div className="text-gray-400">
                                  B{seat.bench}·S{seat.seat_num} Empty
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Final Print Page: Invigilator Duty & Sign-Off Sheet */}
        <div className="space-y-4">
          <div className="border-b border-black pb-2">
            <h2 className="text-xl font-serif font-semibold">
              Invigilator Duty &amp; Sign-off Roster
            </h2>
            <p className="text-xs">
              {sourceLabel ? `${sourceLabel} · ` : ""}Total students: {enrichedRows.length} across{" "}
              {result.room_allocations.length}{" "}
              {result.room_allocations.length === 1 ? "hall" : "halls"}
            </p>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="border-b border-black bg-gray-100">
                <th className="p-2 border-r border-black">Hall</th>
                <th className="p-2 border-r border-black">Duty Post</th>
                <th className="p-2 border-r border-black">Assigned Rows</th>
                <th className="p-2 border-r border-black">Invigilator Name</th>
                <th className="p-2">Signature</th>
              </tr>
            </thead>
            <tbody>
              {invigilatorSchedule.flatMap((hall) =>
                hall.posts.map((post) => (
                  <tr key={`${hall.room_id}-${post.postLabel}`} className="border-b border-gray-400">
                    <td className="p-2 border-r border-black font-semibold">Hall {hall.room_id}</td>
                    <td className="p-2 border-r border-black">{post.postLabel}</td>
                    <td className="p-2 border-r border-black">{post.rowRange}</td>
                    <td className="p-2 border-r border-black w-48">&nbsp;</td>
                    <td className="p-2 w-40">&nbsp;</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
