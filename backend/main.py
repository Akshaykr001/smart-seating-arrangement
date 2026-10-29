from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import io
import csv
import math

# Import existing seating logic
from seating.feasibility_check import check_feasibility
from seating.forbidden_positions import assign_special_needs_students
from seating.graph_coloring import build_student_conflict_graph, verify_handshaking_lemma, color_conflict_graph
from seating.seat_mapper import map_students_to_seats
from seating.validator import validate_seating_arrangement
from seating.counting import compute_combinatorial_counts

app = FastAPI(title="Smart Examination Seating API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Smart Examination Seating API is running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


class Student(BaseModel):
    id: str
    name: Optional[str] = ""
    student_class: str 
    subject: str
    special_needs: bool

class RoomConfig(BaseModel):
    num_rooms: int = 1
    rows: int = 4
    cols: int = 3
    seats_per_bench: int = 2
    accessible_rule: str = "row_1_and_aisle"
    adjacency_rule: str = "orthogonal" # orthogonal or diagonal
    invigilator_ratio: int = 20

class AssignRequest(BaseModel):
    room_config: RoomConfig
    students: List[Student]

def generate_room_configs(config: RoomConfig):
    room_configs = []
    for r_id in range(1, config.num_rooms + 1):
        accessible_seats = []
        for r in range(1, config.rows + 1):
            for c in range(1, config.cols + 1):
                for s in range(1, config.seats_per_bench + 1):
                    seat_id = f"R{r_id}-r{r}-c{c}-s{s}"
                    is_front = (r == 1)
                    is_aisle = (s == 1 or s == config.seats_per_bench)
                    
                    if config.accessible_rule == "row_1" and is_front:
                        accessible_seats.append(seat_id)
                    elif config.accessible_rule == "aisle" and is_aisle:
                        accessible_seats.append(seat_id)
                    elif config.accessible_rule == "row_1_and_aisle" and (is_front or is_aisle):
                        accessible_seats.append(seat_id)
                    elif config.accessible_rule == "front_aisle_only" and (is_front and is_aisle):
                        accessible_seats.append(seat_id)
                        
        room_configs.append({
            "room_id": r_id,
            "rows": config.rows,
            "cols": config.cols,
            "seats_per_bench": config.seats_per_bench,
            "accessible_seats": accessible_seats
        })
    return room_configs

@app.post("/api/assign")
async def assign_seating(req: AssignRequest):
    try:
        room_configs = generate_room_configs(req.room_config)
        
        # Map students from Pydantic model to dictionary format expected by the seating modules
        students = [
            {
                "id": s.id,
                "name": s.name or "",
                "class": s.student_class,
                "subject": s.subject,
                "special_needs": s.special_needs
            }
            for s in req.students
        ]
        
        if not students:
            raise HTTPException(status_code=400, detail="No students provided")

        diagonal = req.room_config.adjacency_rule == "diagonal"
        
        # 1. Feasibility Pre-Check
        feasibility_report, G_seats = check_feasibility(students, room_configs, diagonal=diagonal)
        
        # Total capacity guard
        if len(students) > G_seats.number_of_nodes():
            raise HTTPException(
                status_code=400, 
                detail=f"Room capacity exceeded! Total students ({len(students)}) > Total seats ({G_seats.number_of_nodes()})."
            )
            
        # 2. Forbidden-Positions Handling
        special_students = [s for s in students if s.get("special_needs", False)]
        try:
            special_assignments, used_seats, special_ids, forbidden_math = assign_special_needs_students(
                special_students, G_seats
            )
        except ValueError:
            accessible_count = sum(1 for _, d in G_seats.nodes(data=True) if d.get("accessible", False))
            raise HTTPException(
                status_code=400,
                detail=f"Not enough accessible seats ({accessible_count}) for {len(special_students)} students who require them."
            )
            
        # 3. Conflict Graph & Coloring (silently computed, we will hide it from the UI but it's part of the logic)
        G_conflict = build_student_conflict_graph(students)
        student_coloring, chromatic_number, color_partitions = color_conflict_graph(G_conflict)
        
        # 4. Seat Mapping
        seat_assignments, student_to_seat, relaxed_constraints_internal, unassigned_students = map_students_to_seats(
            students,
            G_seats,
            already_assigned_special=special_assignments,
            diagonal=diagonal
        )
        
        # 5. Propositional Logic Validation
        validation_certificate = validate_seating_arrangement(seat_assignments, G_seats, students)
        
        # Format constraints for UI
        class_conflicts = []
        for v in validation_certificate["propositions"][0]["violations"]:
            class_conflicts.append({
                "seat_a": v["seat_u"],
                "seat_b": v["seat_v"],
                "seat_a_label": v["seat_u_label"],
                "seat_b_label": v["seat_v_label"],
                "student_a": v["student_u"],
                "student_b": v["student_v"],
                "section": v["conflicting_class"]
            })

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
            
        # 6. Format Result Data for UI
        room_allocations = {}
        for r_id in range(1, req.room_config.num_rooms + 1):
            room_allocations[r_id] = {
                "room_id": r_id,
                "rows": req.room_config.rows,
                "cols": req.room_config.cols,
                "seats_per_bench": req.room_config.seats_per_bench,
                "seats_grid": [],
                "student_count": 0,
                "special_needs_count": 0,
                "invigilators_needed": 0,
                "invigilators_list": [],
                "class_violations": 0,
                "subject_violations": 0
            }
            
            for r in range(1, req.room_config.rows + 1):
                row_benches = []
                for c in range(1, req.room_config.cols + 1):
                    bench_seats = []
                    for s in range(1, req.room_config.seats_per_bench + 1):
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
                
            stu_in_room = room_allocations[r_id]["student_count"]
            needed = max(1, math.ceil(stu_in_room / req.room_config.invigilator_ratio)) if stu_in_room > 0 else 0
            room_allocations[r_id]["invigilators_needed"] = needed
            
        for v in validation_certificate["propositions"][0]["violations"]:
            room_id = G_seats.nodes[v["seat_u"]].get("room_id", 1)
            if room_id in room_allocations:
                room_allocations[room_id]["class_violations"] += 1
                
        for v in validation_certificate["propositions"][1]["violations"]:
            room_id = G_seats.nodes[v["seat_u"]].get("room_id", 1)
            if room_id in room_allocations:
                room_allocations[room_id]["subject_violations"] += 1

        flat_allocation_table = []
        for seat_id, stu in seat_assignments.items():
            relaxed_str = "No"
            if stu.get("has_class_conflict"):
                relaxed_str = "Yes (Class)"
            elif stu.get("has_subject_relaxation"):
                relaxed_str = "Yes (Subject)"
                
            flat_allocation_table.append({
                "room_id": G_seats.nodes.get(seat_id, {}).get("room_id", stu.get("room_id", 1)),
                "seat_id": seat_id,
                "seat_label": stu.get("seat_label", seat_id),
                "student_id": stu["id"],
                "name": stu.get("name", ""),
                "class": stu.get("class", ""),
                "subject": stu.get("subject", ""),
                "special_needs": stu.get("special_needs"),
                "relaxed": relaxed_str
            })
            
        flat_allocation_table.sort(key=lambda x: (x["room_id"], x["seat_id"]))

        return {
            "success": True,
            "room_allocations": list(room_allocations.values()),
            "flat_allocation_table": flat_allocation_table,
            "class_conflicts": class_conflicts,
            "relaxed_constraints": relaxed_constraints,
            "unassigned_students": unassigned_students,
            "is_feasible": feasibility_report["is_feasible"],
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
