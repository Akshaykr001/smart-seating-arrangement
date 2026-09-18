"""
Integration tests for Flask routes, CSV handling, and results rendering.
"""

import unittest
import json
from app import app


class TestFlaskIntegration(unittest.TestCase):

    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_index_page(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Smart Examination Seating Optimizer", response.data)
        self.assertIn(b"Pigeonhole Principle", response.data)

    def test_sample_csv_downloads(self):
        for preset in ["balanced", "pigeonhole", "multiroom"]:
            res = self.client.get(f"/sample-csv?preset={preset}")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.content_type, "text/csv; charset=utf-8")
            self.assertIn(b"ID,Class,Subject,Special_Needs", res.data)

    def test_assign_route_balanced(self):
        form_data = {
            "num_rooms": "1",
            "rows": "3",
            "cols": "2",
            "seats_per_bench": "2",
            "accessible_rule": "row_1_and_aisle",
            "invigilator_ratio": "20",
            "adjacency_rule": "orthogonal",
            "student_data_text": (
                "ID,Class,Subject,Special_Needs\n"
                "S1,ClassA,DiscreteMath,Y\n"
                "S2,ClassB,Algorithms,N\n"
                "S3,ClassA,DiscreteMath,N\n"
                "S4,ClassB,Algorithms,N\n"
                "S5,ClassA,DiscreteMath,N\n"
                "S6,ClassB,Algorithms,N\n"
            )
        }
        res = self.client.post("/assign", data=form_data)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Optimization Complete", res.data)
        self.assertIn(b"Step 1", res.data)
        self.assertIn(b"Handshaking Lemma", res.data)
        self.assertIn(b"Chromatic Polynomial", res.data)
        self.assertIn(b"Principle of Inclusion-Exclusion", res.data)

    def test_assign_route_pigeonhole_dense(self):
        # 10 students of same class in a 12-seat room (alpha=6) -> triggers PHP alert
        students = "\n".join([f"S{i},HeavyClass,Math,N" for i in range(1, 10)])
        form_data = {
            "num_rooms": "1",
            "rows": "3",
            "cols": "2",
            "seats_per_bench": "2",
            "accessible_rule": "row_1",
            "student_data_text": f"ID,Class,Subject,Special_Needs\n{students}"
        }
        res = self.client.post("/assign", data=form_data)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Pigeonhole", res.data)

    def test_export_csv_route(self):
        sample_alloc = [
            {
                "room_id": 1,
                "seat_id": "R1-r1-c1-s1",
                "seat_label": "Room 1 [Row 1, Bench 1, Seat 1]",
                "student_id": "STU001",
                "class": "ClassA",
                "subject": "Discrete Math",
                "special_needs": "Yes",
                "relaxed": "No"
            }
        ]
        res = self.client.post("/export-csv", data={"allocation_json": json.dumps(sample_alloc)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, "text/csv; charset=utf-8")
        self.assertIn(b"STU001", res.data)
        self.assertIn(b"Discrete Math", res.data)


if __name__ == "__main__":
    unittest.main()
