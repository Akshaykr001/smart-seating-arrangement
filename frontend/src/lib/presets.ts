import { HallConfig, PresetScenario, StudentRecord } from "@/lib/types";

const SECTION_DEFS = [
  { label: "CSE AIML", prefix: "AIML" },
  { label: "CSE AIDE", prefix: "AIDE" },
  { label: "CSE GEN AI", prefix: "GENAI" },
  { label: "CSE CSBS", prefix: "CSBS" },
  { label: "CSE GENERAL", prefix: "GENERAL" },
] as const;

export const EXAM_SUBJECTS = [
  "Data Structures",
  "Discrete Mathematics",
  "Python",
  "Design Thinking",
  "DBMS",
] as const;

const FIRST_NAMES = [
  "Aarav",
  "Diya",
  "Rohan",
  "Ananya",
  "Vikram",
  "Meera",
  "Aditya",
  "Kavya",
  "Siddharth",
  "Nisha",
  "Karthik",
  "Priya",
  "Pranav",
  "Ishita",
  "Arjun",
  "Sneha",
  "Rahul",
  "Tanvi",
  "Varun",
  "Pooja",
  "Nikhil",
  "Riya",
  "Akash",
  "Divya",
  "Harsh",
  "Shruti",
  "Dev",
  "Neha",
  "Kunal",
  "Aditi",
  "Yash",
  "Kritika",
  "Manish",
  "Swati",
  "Tejas",
  "Anjali",
  "Vivek",
  "Nandini",
  "Gautham",
  "Bhavna",
];

const LAST_NAMES = [
  "Sharma",
  "Nair",
  "Iyer",
  "Patel",
  "Reddy",
  "Rao",
  "Verma",
  "Gupta",
  "Kulkarni",
  "Menon",
  "Joshi",
  "Chatterjee",
  "Deshmukh",
  "Bhat",
  "Pillai",
  "Kapoor",
  "Malhotra",
  "Krishnan",
  "Shetty",
  "Bose",
  "Agarwal",
  "Choudhury",
  "Mishra",
  "Saxena",
  "Hegde",
  "Sundaram",
  "Sengupta",
  "Tiwari",
  "Nambiar",
  "Banerjee",
];

function deterministicName(sectionIndex: number, studentNumber: number, presetSalt: number): string {
  const fIdx = (studentNumber * 7 + sectionIndex * 11 + presetSalt * 5) % FIRST_NAMES.length;
  const lIdx = (studentNumber * 13 + sectionIndex * 5 + presetSalt * 3) % LAST_NAMES.length;
  return `${FIRST_NAMES[fIdx]} ${LAST_NAMES[lIdx]}`;
}

function summarizeSections(students: StudentRecord[]) {
  const map = new Map<string, number>();
  for (const s of students) {
    map.set(s.student_class, (map.get(s.student_class) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([section, count]) => ({ section, count }));
}

function buildPreset1(): PresetScenario {
  const students: StudentRecord[] = [];
  SECTION_DEFS.forEach((sec, sIdx) => {
    for (let i = 1; i <= 12; i++) {
      const isAccessible = (sIdx === 0 && i === 1) || (sIdx === 2 && i === 1);
      students.push({
        id: `${sec.prefix}-${String(i).padStart(3, "0")}`,
        name: deterministicName(sIdx, i, 1),
        student_class: sec.label,
        subject: EXAM_SUBJECTS[sIdx],
        special_needs: isAccessible,
      });
    }
  });

  const hallConfig: HallConfig = {
    num_rooms: 1,
    rows: 8,
    cols: 4,
    seats_per_bench: 2,
    accessible_rule: "row_1",
    adjacency_rule: "orthogonal",
    invigilator_ratio: 20,
  };

  return {
    id: "midterm-single",
    title: "Mid-term · Single hall",
    description: "60 students across five even sections in one 64-seat hall, with 2 accessible seats.",
    students,
    hallConfig,
    sectionCounts: summarizeSections(students),
  };
}

function buildPreset2(): PresetScenario {
  const students: StudentRecord[] = [];
  SECTION_DEFS.forEach((sec, sIdx) => {
    for (let i = 1; i <= 24; i++) {
      const isAccessible = sIdx < 4 && i === 1;
      students.push({
        id: `${sec.prefix}-${String(i).padStart(3, "0")}`,
        name: deterministicName(sIdx, i, 2),
        student_class: sec.label,
        subject: EXAM_SUBJECTS[sIdx],
        special_needs: isAccessible,
      });
    }
  });

  const hallConfig: HallConfig = {
    num_rooms: 2,
    rows: 8,
    cols: 4,
    seats_per_bench: 2,
    accessible_rule: "row_1",
    adjacency_rule: "orthogonal",
    invigilator_ratio: 20,
  };

  return {
    id: "endsem-two-halls",
    title: "End-semester · Two halls",
    description: "120 students split across two 64-seat halls with invigilator assignments.",
    students,
    hallConfig,
    sectionCounts: summarizeSections(students),
  };
}

function buildPreset3(): PresetScenario {
  const students: StudentRecord[] = [];
  const accessibleKeys = new Set([
    "0-1",
    "1-1",
    "2-1",
    "3-1",
    "4-1",
    "2-2",
  ]);

  SECTION_DEFS.forEach((sec, sIdx) => {
    for (let i = 1; i <= 8; i++) {
      students.push({
        id: `${sec.prefix}-${String(i).padStart(3, "0")}`,
        name: deterministicName(sIdx, i, 3),
        student_class: sec.label,
        subject: EXAM_SUBJECTS[sIdx],
        special_needs: accessibleKeys.has(`${sIdx}-${i}`),
      });
    }
  });

  const hallConfig: HallConfig = {
    num_rooms: 1,
    rows: 6,
    cols: 4,
    seats_per_bench: 2,
    accessible_rule: "row_1_and_aisle",
    adjacency_rule: "orthogonal",
    invigilator_ratio: 20,
  };

  return {
    id: "accessibility-focus",
    title: "Accessibility focus",
    description: "40 students with 6 placed into front-row and aisle accessible seats.",
    students,
    hallConfig,
    sectionCounts: summarizeSections(students),
  };
}

function buildPreset4(): PresetScenario {
  const students: StudentRecord[] = [];
  const counts = [22, 10, 8, 8, 8];

  SECTION_DEFS.forEach((sec, sIdx) => {
    const count = counts[sIdx];
    for (let i = 1; i <= count; i++) {
      const isAccessible = sIdx === 0 && i <= 2;
      const subject =
        sIdx === 0
          ? "Data Structures"
          : i % 2 === 0
          ? "Python"
          : "DBMS";

      students.push({
        id: `${sec.prefix}-${String(i).padStart(3, "0")}`,
        name: deterministicName(sIdx, i, 4),
        student_class: sec.label,
        subject,
        special_needs: isAccessible,
      });
    }
  });

  const hallConfig: HallConfig = {
    num_rooms: 1,
    rows: 8,
    cols: 4,
    seats_per_bench: 2,
    accessible_rule: "row_1",
    adjacency_rule: "orthogonal",
    invigilator_ratio: 20,
  };

  return {
    id: "crowded-hall",
    title: "Crowded hall",
    description: "56 students with uneven section sizes — keeps sections apart with 2 subject overlaps.",
    students,
    hallConfig,
    sectionCounts: summarizeSections(students),
  };
}

function buildPreset5(): PresetScenario {
  const students: StudentRecord[] = [];
  const counts = [36, 5, 5, 5, 5];

  SECTION_DEFS.forEach((sec, sIdx) => {
    const count = counts[sIdx];
    for (let i = 1; i <= count; i++) {
      const isAccessible = (sIdx === 1 && i === 1) || (sIdx === 2 && i === 1);
      students.push({
        id: `${sec.prefix}-${String(i).padStart(3, "0")}`,
        name: deterministicName(sIdx, i, 5),
        student_class: sec.label,
        subject: EXAM_SUBJECTS[sIdx],
        special_needs: isAccessible,
      });
    }
  });

  const hallConfig: HallConfig = {
    num_rooms: 1,
    rows: 8,
    cols: 4,
    seats_per_bench: 2,
    accessible_rule: "row_1",
    adjacency_rule: "orthogonal",
    invigilator_ratio: 20,
  };

  return {
    id: "overbooked-section",
    title: "Overbooked section",
    description: "36 CSE AIML students in a 64-seat hall — highlights unavoidable adjacent pairs.",
    students,
    hallConfig,
    sectionCounts: summarizeSections(students),
  };
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  buildPreset1(),
  buildPreset2(),
  buildPreset3(),
  buildPreset4(),
  buildPreset5(),
];
