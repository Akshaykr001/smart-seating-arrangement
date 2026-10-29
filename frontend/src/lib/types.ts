export interface StudentRecord {
  id: string;
  name: string;
  student_class: string;
  subject: string;
  special_needs: boolean;
}

export type AccessibleRule =
  | "row_1_and_aisle"
  | "row_1"
  | "aisle"
  | "front_aisle_only";

export type AdjacencyRule = "orthogonal" | "diagonal";

export interface HallConfig {
  num_rooms: number;
  rows: number;
  cols: number; // benches per row
  seats_per_bench: number;
  accessible_rule: AccessibleRule;
  adjacency_rule: AdjacencyRule;
  invigilator_ratio: number;
}

export interface PresetScenario {
  id: string;
  title: string;
  description: string;
  students: StudentRecord[];
  hallConfig: HallConfig;
  sectionCounts: Array<{ section: string; count: number }>;
}

export interface AssignedStudent {
  id: string;
  name?: string;
  class: string;
  subject: string;
  special_needs: boolean;
  assigned_seat?: string;
  seat_label?: string;
  room_id?: number;
  has_class_conflict?: boolean;
  has_subject_relaxation?: boolean;
}

export interface SeatCell {
  seat_id: string;
  label: string;
  row: number;
  bench: number;
  seat_num: number;
  accessible: boolean;
  student: AssignedStudent | null;
}

export interface BenchCell {
  bench_num: number;
  seats: SeatCell[];
}

export interface RowCell {
  row_num: number;
  benches: BenchCell[];
}

export interface RoomAllocation {
  room_id: number;
  rows: number;
  cols: number;
  seats_per_bench: number;
  seats_grid: RowCell[];
  student_count: number;
  special_needs_count: number;
  invigilators_needed: number;
  class_violations: number;
  subject_violations: number;
}

export interface FlatAllocationRow {
  room_id: number;
  seat_id: string;
  seat_label: string;
  student_id: string;
  name?: string;
  class: string;
  subject: string;
  special_needs: boolean;
  relaxed: string;
}

export interface SectionConflictPair {
  seat_a: string;
  seat_b: string;
  seat_a_label: string;
  seat_b_label: string;
  student_a: string;
  student_b: string;
  section: string;
}

export interface SubjectOverlapPair {
  seat_a: string;
  seat_b: string;
  seat_a_label: string;
  seat_b_label: string;
  student_a: string;
  student_b: string;
  subject: string;
}

export interface AssignResponse {
  success: boolean;
  room_allocations: RoomAllocation[];
  flat_allocation_table: FlatAllocationRow[];
  class_conflicts?: SectionConflictPair[];
  relaxed_constraints: SubjectOverlapPair[];
  unassigned_students: AssignedStudent[];
  is_feasible: boolean;
}
