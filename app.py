"""
Smart Examination Seating Arrangement - Flask Web Application
Discrete Mathematics Course Project Optimizer
"""

import csv
import io
import math
# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, redirect, url_for, flash, Response, jsonify

from seating.feasibility_check import build_seat_adjacency_graph, check_feasibility
from seating.forbidden_positions import assign_special_needs_students
from seating.graph_coloring import (
    build_student_conflict_graph,
    verify_handshaking_lemma,
    color_conflict_graph,
    get_small_worked_chromatic_polynomial
)
from seating.seat_mapper import map_students_to_seats
from seating.validator import validate_seating_arrangement
from seating.counting import compute_combinatorial_counts

app = Flask(__name__)
app.secret_key = "discrete_math_smart_exam_seating_secret_key"


def parse_csv_students(file_stream_or_text):
    """
    Parses student CSV input. Accepts either a file-like stream or raw string.
    Expected columns: id, class, subject, special_needs (Y/N or True/False)
    """
    if isinstance(file_stream_or_text, str):
        stream = io.StringIO(file_stream_or_text.strip())
    else:
        stream = io.StringIO(file_stream_or_text.read().decode("utf-8-sig", errors="replace"))
        
    reader = csv.reader(stream)
    rows = list(reader)
    if not rows:
        raise ValueError("CSV input is completely empty.")
        
    # Check header
    header = [h.strip().lower() for h in rows[0]]
    id_idx, class_idx, subj_idx, sn_idx = -1, -1, -1, -1
    
    for i, col in enumerate(header):
        if col in ["id", "student_id", "roll_no", "studentid", "student id"]:
            id_idx = i
        elif col in ["class", "section", "class/section", "dept", "department"]:
            class_idx = i
        elif col in ["subject", "course", "paper", "exam"]:
            subj_idx = i
        elif col in ["special_needs", "special needs", "accessible", "disability", "pwd", "accessible_required"]:
            sn_idx = i
            
    # Fallback to positional columns if header labels don't match
    start_row = 1
    if id_idx == -1 or class_idx == -1:
        if len(rows[0]) >= 2:
            id_idx = 0
            class_idx = 1
            subj_idx = 2 if len(rows[0]) > 2 else -1
            sn_idx = 3 if len(rows[0]) > 3 else -1
            start_row = 0
        else:
            raise ValueError(
                "Malformed CSV header. Required columns: ID, Class, Subject, Special_Needs (Y/N)."
            )
            
    students = []
    seen_ids = set()
    
    for line_num, row in enumerate(rows[start_row:], start=start_row + 1):
        if not row or not any(field.strip() for field in row):
            continue  # skip empty lines
            
        stu_id = row[id_idx].strip() if id_idx < len(row) else f"STU{line_num:03d}"
        if not stu_id:
            stu_id = f"STU{line_num:03d}"
            
        if stu_id in seen_ids:
            stu_id = f"{stu_id}_{line_num}"
        seen_ids.add(stu_id)
        
        stu_class = row[class_idx].strip() if class_idx < len(row) and row[class_idx].strip() else "Class-A"
        stu_subj = row[subj_idx].strip() if subj_idx != -1 and subj_idx < len(row) and row[subj_idx].strip() else "Discrete Mathematics"
        
        # Special needs flag
        sn_raw = row[sn_idx].strip().upper() if sn_idx != -1 and sn_idx < len(row) else "N"
        special_needs = sn_raw in ["Y", "YES", "TRUE", "1", "T"]
        
        students.append({
            "id": stu_id,
            "class": stu_class,
            "subject": stu_subj,
            "special_needs": special_needs
        })
        
    if not students:
        raise ValueError("No valid student records found in CSV.")
        
    return students


@app.route("/", methods=["GET"])
def index():
    """Renders the main input form and presets."""
    return render_template("index.html")


@app.route("/sample-csv", methods=["GET"])
def sample_csv():
    """Generates and downloads sample student CSV files for testing."""
    preset = request.args.get("preset", "balanced")
    
    if preset == "pigeonhole":
        # Dense class triggering Pigeonhole Principle warning
        data = [
            ["ID", "Class", "Subject", "Special_Needs"],
            ["STU001", "CSE AIML", "Maths", "Y"],
            ["STU002", "CSE CSBS", "Physics", "N"],
            ["STU003", "CSE Gen", "Chemistry", "N"],
            ["STU004", "CSE IBM", "Biology", "N"],
            ["STU005", "CSE AIML", "Maths", "N"],
            ["STU006", "CSE CSBS", "Physics", "N"],
            ["STU007", "CSE Gen", "Chemistry", "N"],
            ["STU008", "CSE IBM", "Biology", "N"],
            ["STU009", "CSE AIML", "Maths", "N"],
            ["STU010", "CSE CSBS", "Physics", "N"],
            ["STU011", "CSE Gen", "Chemistry", "N"],
            ["STU012", "CSE IBM", "Biology", "N"],
            ["STU013", "CSE AIML", "Maths", "Y"],
            ["STU014", "CSE CSBS", "Physics", "N"],
        ]
        filename = "pigeonhole_stress_test.csv"
    elif preset == "multiroom":
        data = [["ID", "Class", "Subject", "Special_Needs"]]
        for i in range(1, 37):
            cls = "CSE Gen" if i % 3 == 0 else ("CSE IBM" if i % 3 == 1 else "CSE AIDE")
            subj = "Chemistry" if i % 2 == 0 else "Python"
            sn = "Y" if i in [1, 10, 21] else "N"
            data.append([f"MR-{i:03d}", cls, subj, sn])
        filename = "multi_room_exam_students.csv"
    else:  # balanced
        data = [
            ["ID", "Class", "Subject", "Special_Needs"],
            ["STU001", "CSE Gen", "DSA", "Y"],
            ["STU002", "CSE IBM", "Design Thinking", "N"],
            ["STU003", "CSE Gen", "DSA", "N"],
            ["STU004", "CSE IBM", "Design Thinking", "N"],
            ["STU005", "CSE Gen", "Python", "N"],
            ["STU006", "CSE IBM", "Python", "N"],
            ["STU007", "CSE AIML", "DSA", "Y"],
            ["STU008", "CSE Gen", "Design Thinking", "N"],
            ["STU009", "CSE IBM", "DSA", "N"],
            ["STU010", "CSE AIML", "Python", "N"],
            ["STU011", "CSE Gen", "DSA", "N"],
            ["STU012", "CSE IBM", "Design Thinking", "N"],
            ["STU013", "CSE AIML", "Python", "N"],
            ["STU014", "CSE Gen", "Design Thinking", "N"],
            ["STU015", "CSE IBM", "DSA", "N"],
            ["STU016", "CSE AIML", "DSA", "N"],
        ]
        filename = "balanced_exam_students.csv"
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(data)
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )


@app.route("/assign", methods=["POST"])
def assign():
    """
    Main seating assignment controller running Steps 1 through 6:
    1. Feasibility pre-check (Pigeonhole Principle)
    2. Forbidden positions (Special-needs seating)
    3. Graph coloring & Handshaking lemma (NetworkX)
    4. Seat mapping & soft-constraint relaxation
    5. Propositional logic validation
    6. Combinatorial counting (Product Rule & PIE)
    """
    try:
        # --- 1. Parse Room Configurations ---
        num_rooms = int(request.form.get("num_rooms", 1))
        rows = int(request.form.get("rows", 4))
        cols = int(request.form.get("cols", 3))  # benches per row
        seats_per_bench = int(request.form.get("seats_per_bench", 2))
        accessible_rule = request.form.get("accessible_rule", "row_1_and_aisle")
        diagonal = request.form.get("adjacency_rule") == "diagonal"
        students_per_invigilator = max(5, int(request.form.get("invigilator_ratio", 20)))
        
        room_configs = []
        for r_id in range(1, num_rooms + 1):
            # Generate accessible seats based on rule
            accessible_seats = []
            for r in range(1, rows + 1):
                for c in range(1, cols + 1):
                    for s in range(1, seats_per_bench + 1):
                        seat_id = f"R{r_id}-r{r}-c{c}-s{s}"
                        is_front = (r == 1)
                        is_aisle = (s == 1 or s == seats_per_bench)
                        
                        if accessible_rule == "row_1" and is_front:
                            accessible_seats.append(seat_id)
                        elif accessible_rule == "aisle" and is_aisle:
                            accessible_seats.append(seat_id)
                        elif accessible_rule == "row_1_and_aisle" and (is_front or is_aisle):
                            accessible_seats.append(seat_id)
                        elif accessible_rule == "front_aisle_only" and (is_front and is_aisle):
                            accessible_seats.append(seat_id)
                            
            room_configs.append({
                "room_id": r_id,
                "rows": rows,
                "cols": cols,
                "seats_per_bench": seats_per_bench,
                "accessible_seats": accessible_seats
            })
            
        # --- 2. Parse Students Input ---
        csv_file = request.files.get("csv_file")
        manual_text = request.form.get("student_data_text", "").strip()
        
        if csv_file and csv_file.filename:
            students = parse_csv_students(csv_file)
        elif manual_text:
            students = parse_csv_students(manual_text)
        else:
            flash("Please upload a student CSV file or enter student data in the text box.", "warning")
            return redirect(url_for("index"))
            
        if not students:
            flash("No valid students found in the provided input.", "error")
            return redirect(url_for("index"))
            
        # --- Step 1: Feasibility Pre-Check (Pigeonhole Principle) ---
        feasibility_report, G_seats = check_feasibility(students, room_configs, diagonal=diagonal)
        
        # Total capacity guard
        if len(students) > G_seats.number_of_nodes():
            flash(
                f"Error: Room capacity exceeded! Total students ({len(students)}) > Total seats ({G_seats.number_of_nodes()}). "
                f"Please add more rooms or expand bench dimensions.",
                "error"
            )
            return render_template(
                "results.html",
                error_occurred=True,
                error_title="Capacity Exceeded",
                error_message=f"Student count ({len(students)}) exceeds total available seats ({G_seats.number_of_nodes()}) across {num_rooms} room(s).",
                feasibility_report=feasibility_report
            )
            
        # --- Step 2: Forbidden-Positions Handling for Special-Needs ---
        special_students = [s for s in students if s.get("special_needs", False)]
        try:
            special_assignments, used_seats, special_ids, forbidden_math = assign_special_needs_students(
                special_students, G_seats
            )
        except ValueError as ve:
            flash(str(ve), "error")
            return render_template(
                "results.html",
                error_occurred=True,
                error_title="Forbidden Positions Infeasibility",
                error_message=str(ve),
                feasibility_report=feasibility_report
            )
            
        # --- Step 3: Conflict Graph Construction & Coloring (NetworkX) ---
        G_conflict = build_student_conflict_graph(students)
        handshaking_report = verify_handshaking_lemma(G_conflict)
        student_coloring, chromatic_number, color_partitions = color_conflict_graph(G_conflict)
        chromatic_worked_example = get_small_worked_chromatic_polynomial()
        
        # --- Step 4: Seat Mapping with Soft Subject Constraint ---
        seat_assignments, student_to_seat, relaxed_constraints, unassigned_students = map_students_to_seats(
            students,
            G_seats,
            already_assigned_special=special_assignments,
            diagonal=diagonal
        )
        
        # --- Step 5: Explicit Propositional Logic Validation ---
        validation_certificate = validate_seating_arrangement(seat_assignments, G_seats, students)
        
        # Extract relaxed_constraints from validation_certificate for the UI
        # Map them to the format expected by results.html
        relaxed_constraints = []
        for v in validation_certificate["propositions"][1]["violations"]:
            relaxed_constraints.append({
                "seat_a": v["seat_u"],
                "seat_b": v["seat_v"],
                "seat_a_label": v["seat_u_label"],
                "seat_b_label": v["seat_v_label"],
                "student_a": v["student_u"],
                "student_b": v["student_v"],
                "subject": v["subject"]
            })
        
        # --- Step 6: Combinatorial Counting (Product Rule & PIE) ---
        counting_report = compute_combinatorial_counts(students, G_seats)
        
        # --- Invigilator Placeholder Calculation ---
        # Group assigned students by room
        room_allocations = {}
        for r_id in range(1, num_rooms + 1):
            room_allocations[r_id] = {
                "room_id": r_id,
                "rows": rows,
                "cols": cols,
                "seats_per_bench": seats_per_bench,
                "seats_grid": [],
                "student_count": 0,
                "special_needs_count": 0,
                "invigilators_needed": 0,
                "invigilators_list": [],
                "class_violations": 0,
                "subject_violations": 0
            }
            
            # Construct visual grid structure for Jinja template
            for r in range(1, rows + 1):
                row_benches = []
                for c in range(1, cols + 1):
                    bench_seats = []
                    for s in range(1, seats_per_bench + 1):
                        seat_id = f"R{r_id}-r{r}-c{c}-s{s}"
                        node_data = G_seats.nodes.get(seat_id, {})
                        assigned_student = seat_assignments.get(seat_id)
                        
                        if assigned_student:
                            room_allocations[r_id]["student_count"] += 1
                            if assigned_student.get("special_needs"):
                                room_allocations[r_id]["special_needs_count"] += 1
                                
                        bench_seats.append({
                            "seat_id": seat_id,
                            "label": node_data.get("seat_label", seat_id),
                            "row": r,
                            "bench": c,
                            "seat_num": s,
                            "accessible": node_data.get("accessible", False),
                            "student": assigned_student
                        })
                    row_benches.append({"bench_num": c, "seats": bench_seats})
                room_allocations[r_id]["seats_grid"].append({"row_num": r, "benches": row_benches})
                
            # Invigilators needed
            stu_in_room = room_allocations[r_id]["student_count"]
            needed = max(1, math.ceil(stu_in_room / students_per_invigilator)) if stu_in_room > 0 else 0
            room_allocations[r_id]["invigilators_needed"] = needed
            room_allocations[r_id]["invigilators_list"] = [
                f"Invigilator #{i} (Room {r_id} Post)"
                for i in range(1, needed + 1)
            ]
            
        # Tally up violations per room based on validation_certificate edges
        # We count the number of edge pairs (divided by 2 since undirected edges are stored, 
        # wait, validator iterates over G_seats.edges() which are undirected, so each edge is counted once)
        for v in validation_certificate["propositions"][0]["violations"]:
            room_id = G_seats.nodes[v["seat_u"]].get("room_id", 1)
            if room_id in room_allocations:
                room_allocations[room_id]["class_violations"] += 1
                
        for v in validation_certificate["propositions"][1]["violations"]:
            room_id = G_seats.nodes[v["seat_u"]].get("room_id", 1)
            if room_id in room_allocations:
                room_allocations[room_id]["subject_violations"] += 1
            
        # Format printable flat allocation list
        flat_allocation_table = []
        for seat_id, stu in seat_assignments.items():
            relaxed_str = "No"
            if stu.get("has_class_conflict"):
                relaxed_str = "Yes (Class)"
            elif stu.get("has_subject_relaxation"):
                relaxed_str = "Yes (Subject)"
                
            flat_allocation_table.append({
                "room_id": stu.get("room_id", 1),
                "seat_id": seat_id,
                "seat_label": stu.get("seat_label", seat_id),
                "student_id": stu["id"],
                "class": stu.get("class", ""),
                "subject": stu.get("subject", ""),
                "special_needs": "Yes" if stu.get("special_needs") else "No",
                "relaxed": relaxed_str
            })
            
        flat_allocation_table.sort(key=lambda x: (x["room_id"], x["seat_id"]))
        
        return render_template(
            "results.html",
            error_occurred=False,
            students_count=len(students),
            rooms_count=num_rooms,
            room_allocations=room_allocations,
            flat_allocation_table=flat_allocation_table,
            feasibility_report=feasibility_report,
            forbidden_math=forbidden_math,
            handshaking_report=handshaking_report,
            chromatic_number=chromatic_number,
            chromatic_worked_example=chromatic_worked_example,
            validation_certificate=validation_certificate,
            relaxed_constraints=relaxed_constraints,
            counting_report=counting_report,
            unassigned_students=unassigned_students,
            diagonal_enabled=diagonal,
            invigilator_ratio=students_per_invigilator
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        flash(f"Application error: {str(e)}", "error")
        return redirect(url_for("index"))


@app.route("/export-csv", methods=["POST"])
def export_csv():
    """Generates and downloads the allocated seating plan as CSV."""
    rows_data = request.form.get("allocation_json")
    if not rows_data:
        return "No data to export", 400
        
    import json
    try:
        allocations = json.loads(rows_data)
    except Exception:
        return "Invalid allocation JSON", 400
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Room No", "Seat ID", "Seat Location", "Student ID", "Class / Section", "Subject", "Special Needs", "Relaxed Constraint"])
    
    for item in allocations:
        writer.writerow([
            item.get("room_id", 1),
            item.get("seat_id", ""),
            item.get("seat_label", ""),
            item.get("student_id", ""),
            item.get("class", ""),
            item.get("subject", ""),
            item.get("special_needs", "No"),
            item.get("relaxed", "No")
        ])
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=smart_exam_seating_allocation.csv"}
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
