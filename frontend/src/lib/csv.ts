import { StudentRecord } from "@/lib/types";

export interface CSVParseResult {
  students: StudentRecord[];
  errors: string[];
}

function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

const ID_HEADERS = new Set(["id", "student_id", "student id", "studentid", "roll_no", "roll no", "rollno", "usn", "reg_no"]);
const NAME_HEADERS = new Set(["name", "student_name", "student name", "full_name", "full name"]);
const SECTION_HEADERS = new Set(["section", "class", "class/section", "branch", "department", "dept"]);
const SUBJECT_HEADERS = new Set(["subject", "course", "paper", "exam", "subject_name"]);
const ACCESSIBLE_HEADERS = new Set([
  "accessible",
  "accessible_seat",
  "accessible seat",
  "special_needs",
  "special needs",
  "pwd",
  "accommodation",
]);

const YES_VALUES = new Set(["y", "yes", "true", "1"]);
const NO_VALUES = new Set(["", "n", "no", "false", "0"]);

export function parseStudentCSV(rawText: string): CSVParseResult {
  const cleanText = rawText.replace(/^\uFEFF/, "");
  const rawLines = cleanText.split(/\r?\n/);

  const nonEmptyLines: Array<{ rowNumber: number; text: string }> = [];
  rawLines.forEach((line, index) => {
    if (line.trim().length > 0) {
      nonEmptyLines.push({ rowNumber: index + 1, text: line });
    }
  });

  if (nonEmptyLines.length === 0) {
    return {
      students: [],
      errors: ["This CSV file is empty. Download the sample CSV to see the expected columns."],
    };
  }

  const headerCells = splitCSVLine(nonEmptyLines[0].text).map((h) => h.toLowerCase().trim());

  const idIdx = headerCells.findIndex((h) => ID_HEADERS.has(h));
  const nameIdx = headerCells.findIndex((h) => NAME_HEADERS.has(h));
  const sectionIdx = headerCells.findIndex((h) => SECTION_HEADERS.has(h));
  const subjectIdx = headerCells.findIndex((h) => SUBJECT_HEADERS.has(h));
  const accessibleIdx = headerCells.findIndex((h) => ACCESSIBLE_HEADERS.has(h));

  const missingHeaders: string[] = [];
  if (idIdx === -1) missingHeaders.push("ID");
  if (sectionIdx === -1) missingHeaders.push("Section");
  if (subjectIdx === -1) missingHeaders.push("Subject");

  if (missingHeaders.length > 0) {
    return {
      students: [],
      errors: [
        `Row ${nonEmptyLines[0].rowNumber} (header): Missing required column${
          missingHeaders.length > 1 ? "s" : ""
        }: ${missingHeaders.join(", ")}. Expected columns like ID, Name, Section, Subject, Accessible.`,
      ],
    };
  }

  if (nonEmptyLines.length < 2) {
    return {
      students: [],
      errors: ["Row 2: No student rows found below the header row."],
    };
  }

  const errors: string[] = [];
  const students: StudentRecord[] = [];
  const seenIds = new Map<string, number>();

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const { rowNumber, text } = nonEmptyLines[i];
    const cols = splitCSVLine(text);

    const id = (cols[idIdx] ?? "").trim();
    const name = nameIdx !== -1 ? (cols[nameIdx] ?? "").trim() : "";
    const section = (cols[sectionIdx] ?? "").trim();
    const subject = (cols[subjectIdx] ?? "").trim();
    const accessibleRaw = accessibleIdx !== -1 ? (cols[accessibleIdx] ?? "").trim() : "";

    if (!id) {
      errors.push(`Row ${rowNumber}: Student ID is missing.`);
      continue;
    }

    const upperKey = id.toUpperCase();
    if (seenIds.has(upperKey)) {
      errors.push(
        `Row ${rowNumber}: Duplicate Student ID "${id}" (already listed on row ${seenIds.get(upperKey)}).`
      );
      continue;
    }
    seenIds.set(upperKey, rowNumber);

    if (!section) {
      errors.push(`Row ${rowNumber}: Section is missing for student ${id}.`);
      continue;
    }

    if (!subject) {
      errors.push(`Row ${rowNumber}: Subject is missing for student ${id}.`);
      continue;
    }

    const lowerAcc = accessibleRaw.toLowerCase();
    if (!YES_VALUES.has(lowerAcc) && !NO_VALUES.has(lowerAcc)) {
      errors.push(
        `Row ${rowNumber}: Accessible seat value "${accessibleRaw}" for ${id} wasn't recognized. Use Yes or No.`
      );
      continue;
    }

    students.push({
      id,
      name,
      student_class: section,
      subject,
      special_needs: YES_VALUES.has(lowerAcc),
    });
  }

  return { students, errors };
}

export function generateSampleCSV(): string {
  const rows = [
    ["ID", "Name", "Section", "Subject", "Accessible"],
    ["AIML-001", "Aarav Sharma", "CSE AIML", "Data Structures", "Yes"],
    ["AIML-002", "Diya Nair", "CSE AIML", "Data Structures", "No"],
    ["AIDE-001", "Rohan Iyer", "CSE AIDE", "Discrete Mathematics", "No"],
    ["AIDE-002", "Ananya Patel", "CSE AIDE", "Discrete Mathematics", "No"],
    ["GENAI-001", "Vikram Reddy", "CSE GEN AI", "Python", "Yes"],
    ["GENAI-002", "Meera Rao", "CSE GEN AI", "Python", "No"],
    ["CSBS-001", "Aditya Verma", "CSE CSBS", "Design Thinking", "No"],
    ["CSBS-002", "Kavya Gupta", "CSE CSBS", "Design Thinking", "No"],
    ["GENERAL-001", "Siddharth Kulkarni", "CSE GENERAL", "DBMS", "No"],
    ["GENERAL-002", "Nisha Menon", "CSE GENERAL", "DBMS", "No"],
  ];

  return rows.map((r) => r.join(",")).join("\n");
}

export function triggerCSVDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
